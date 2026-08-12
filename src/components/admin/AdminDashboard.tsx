import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { ZpcLogoMark } from '../brand/ZpcLogo';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import TabEnter from '../motion/TabEnter';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAuth } from '../../contexts/AuthContext';
import {
  ADMIN_APPROVE_PROPERTY,
  ADMIN_DELETE_POST,
  ADMIN_DELETE_PROPERTY,
  ADMIN_PENDING_PROPERTIES,
  ADMIN_POSTS,
  ADMIN_PROPERTIES,
  ADMIN_REJECT_PROPERTY,
  ADMIN_REPORTS,
  ADMIN_REPORT_STATS,
  ADMIN_UPDATE_REPORT_STATUS,
  ADMIN_UPDATE_USER_ROLE,
  ADMIN_USERS,
} from '../../graphql/admin';
import { formatDateTime, isRecentlyActive } from '../../utils/datetime';

type TabId = 'overview' | 'users' | 'posts' | 'properties' | 'reports' | 'approvals';
type LayoutMode = 'list' | 'grid';

const SIDEBAR_WIDTH = 248;
const SIDEBAR_BG = '#00796B';
const ACTIVE_NAV_BG = '#B2DFDB';
const ACTIVE_NAV_TEXT = '#004D40';
const MAIN_BG = '#F8FAFC';
const FONT = "'DM Sans', 'Source Sans 3', system-ui, sans-serif";

const ASSIGNABLE_ROLES = ['admin', 'agent', 'builder', 'general_user'] as const;

const PENDING_PROPERTY_STATUSES = ['PENDING', 'PENDING_VERIFICATION', 'UNDER_REVIEW', 'DRAFT'];

const PAGE_TITLES: Record<TabId, string> = {
  overview: 'Analytics Overview',
  users: 'Users',
  posts: 'Posts',
  properties: 'Properties',
  reports: 'Reported Posts',
  approvals: 'Approvals',
};

/** Account enabled flag (handles camelCase / lowercase GraphQL). */
function accountIsActive(u: any): boolean {
  const v = u?.isactive ?? u?.isActive;
  if (v === false || v === 0 || v === 'false') return false;
  return true;
}

/** Recently logged-in ≈ live (default 30 minutes). */
function isLiveOnline(u: any, withinMinutes = 30): boolean {
  return isRecentlyActive(u?.lastLoginAt || u?.last_login_at, withinMinutes);
}

function isPendingProperty(p: any): boolean {
  const s = String(p?.status || '').toUpperCase();
  const v = String(p?.verificationStatus || '').toUpperCase();
  return PENDING_PROPERTY_STATUSES.includes(s) || PENDING_PROPERTY_STATUSES.includes(v);
}

function propId(p: any): string {
  return String(p?.id || p?.propertyId || '');
}

function propOwnerId(p: any): string {
  return String(p?.createdBy || p?.userId || '');
}

function toUiRole(role?: string | null): string {
  const r = (role || '').toLowerCase();
  if (r === 'user' || r === 'general' || r === 'general_user') return 'general_user';
  return r;
}

function toApiRole(role: string): string {
  if (role === 'general_user') return 'USER';
  return role.toUpperCase();
}

function fmtDate(value?: string | number | null, loc?: { latitude?: number | null; longitude?: number | null }) {
  return formatDateTime(value, {
    latitude: loc?.latitude,
    longitude: loc?.longitude,
    withSeconds: true,
  });
}

function fmtMoney(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function userDisplayName(u: any): string {
  if (!u) return 'Unknown user';
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return name || u.email || `User #${u.id}`;
}

const whiteCardSx = {
  bgcolor: '#FFFFFF',
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
};

const listRowHoverSx = {
  transition: 'background-color 0.18s ease',
  '&:hover': { bgcolor: '#F8FAFC' },
};

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tileBg: string;
  tileColor: string;
}> = ({ label, value, hint, icon, tileBg, tileColor }) => (
  <Box
    sx={{
      ...whiteCardSx,
      p: 2.5,
      minHeight: 120,
      display: 'flex',
      flexDirection: 'column',
      gap: 1.25,
      flex: '1 1 180px',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: FONT }}>{label}</Typography>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: tileBg,
          color: tileColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '1.75rem', color: '#0F172A', lineHeight: 1, fontFamily: FONT }}>
      {value}
    </Typography>
    {hint && (
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#64748B', fontFamily: FONT }}>{hint}</Typography>
    )}
  </Box>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:900px)');
  const { user, clearAuth } = useAuth();

  const [tab, setTab] = useState<TabId>('overview');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    data: usersData,
    loading: usersLoading,
    refetch: refetchUsers,
    error: usersError,
  } = useQuery(ADMIN_USERS, {
    variables: { search: '', page: 1, limit: 200 },
    fetchPolicy: 'network-only',
  });

  const {
    data: propsData,
    loading: propsLoading,
    refetch: refetchProps,
    error: propsError,
  } = useQuery(ADMIN_PROPERTIES, {
    variables: { page: 1, limit: 200 },
    fetchPolicy: 'network-only',
  });

  const {
    data: pendingPropsData,
    loading: pendingPropsLoading,
    refetch: refetchPendingProps,
    error: pendingPropsError,
  } = useQuery(ADMIN_PENDING_PROPERTIES, {
    variables: { page: 1, limit: 200 },
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const {
    data: postsData,
    loading: postsLoading,
    refetch: refetchPosts,
    error: postsError,
  } = useQuery(ADMIN_POSTS, {
    variables: { page: 1, limit: 200 },
    fetchPolicy: 'network-only',
  });

  const {
    data: reportsData,
    loading: reportsLoading,
    refetch: refetchReports,
    error: reportsError,
  } = useQuery(ADMIN_REPORTS, {
    variables: { status: 'PENDING', page: 1, limit: 100 },
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const { data: reportStatsData, refetch: refetchReportStats } = useQuery(ADMIN_REPORT_STATS, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [deletePost, { loading: deletingPost }] = useMutation(ADMIN_DELETE_POST);
  const [deleteProperty, { loading: deletingProperty }] = useMutation(ADMIN_DELETE_PROPERTY);
  const [updateUserRole, { loading: updatingRole }] = useMutation(ADMIN_UPDATE_USER_ROLE);
  const [approveProperty, { loading: approvingProperty }] = useMutation(ADMIN_APPROVE_PROPERTY);
  const [rejectProperty, { loading: rejectingProperty }] = useMutation(ADMIN_REJECT_PROPERTY);
  const [updateReportStatus, { loading: updatingReport }] = useMutation(ADMIN_UPDATE_REPORT_STATUS);

  const users = usersData?.users || [];
  const publicProperties = propsData?.publicProperties?.properties || [];
  const queueProperties = pendingPropsData?.pendingProperties?.properties || [];
  const properties = useMemo(() => {
    const map = new Map<string, any>();
    [...publicProperties, ...queueProperties].forEach((p: any) => {
      if (p?.id) map.set(String(p.id), p);
    });
    return Array.from(map.values());
  }, [publicProperties, queueProperties]);
  const posts = postsData?.searchPosts || [];
  const reports = reportsData?.reports?.reports || [];
  const pendingReportCount =
    reportStatsData?.reportStats?.pendingCount ?? (reportsError ? 0 : reports.length);

  const loading = usersLoading || propsLoading || postsLoading || pendingPropsLoading;

  const userById = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u: any) => map.set(String(u.id), u));
    return map;
  }, [users]);

  const pendingProperties = useMemo(() => {
    if (queueProperties.length) return queueProperties;
    return properties.filter(isPendingProperty);
  }, [queueProperties, properties]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u: any) => accountIsActive(u)).length;
    const liveUsers = users.filter((u: any) => accountIsActive(u) && isLiveOnline(u)).length;
    const byRole: Record<string, number> = {};
    users.forEach((u: any) => {
      const r = (u.role || 'unknown').toLowerCase();
      byRole[r] = (byRole[r] || 0) + 1;
    });
    return {
      totalUsers: users.length,
      activeUsers,
      liveUsers,
      totalProperties: properties.length,
      totalPosts: posts.length,
      reportedPosts: pendingReportCount,
      byRole,
    };
  }, [users, properties, posts, pendingReportCount]);

  const postsByDay = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = posts.filter((p: any) => {
        if (!p.createdAt) return false;
        const created = new Date(p.createdAt);
        created.setHours(0, 0, 0, 0);
        return created.toISOString().slice(0, 10) === key;
      }).length;
      days.push({ label, count });
    }
    return days;
  }, [posts]);

  const maxPostsDay = Math.max(1, ...postsByDay.map((d) => d.count));

  const effectiveUserSearch = tab === 'users' ? headerSearch || userSearch : userSearch;
  const effectivePropertySearch = tab === 'properties' ? headerSearch || propertySearch : propertySearch;

  const filteredUsers = useMemo(() => {
    const q = effectiveUserSearch.trim().toLowerCase();
    return users.filter((u: any) => {
      if (roleFilter !== 'all' && (u.role || '').toLowerCase() !== roleFilter) return false;
      if (userStatusFilter === 'active' && !accountIsActive(u)) return false;
      if (userStatusFilter === 'inactive' && accountIsActive(u)) return false;
      if (userStatusFilter === 'online' && !isLiveOnline(u)) return false;
      if (userStatusFilter === 'offline' && isLiveOnline(u)) return false;
      if (!q) return true;
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.phone || ''} ${u.role || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, effectiveUserSearch, roleFilter, userStatusFilter]);

  const filteredProperties = useMemo(() => {
    const q = effectivePropertySearch.trim().toLowerCase();
    return properties.filter((p: any) => {
      if (statusFilter !== 'all' && String(p.status || '').toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.location || ''} ${p.city || ''} ${p.propertyType || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [properties, effectivePropertySearch, statusFilter]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u: any) => set.add((u.role || 'unknown').toLowerCase()));
    return Array.from(set).sort();
  }, [users]);

  const adminName = useMemo(() => {
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return name || 'Admin';
  }, [user]);

  const navigateTab = (next: TabId) => {
    setTab(next);
    setSidebarOpen(false);
    setHeaderSearch('');
  };

  const refreshAll = async () => {
    setActionMsg(null);
    await Promise.all([
      refetchUsers(),
      refetchProps(),
      refetchPendingProps(),
      refetchPosts(),
      refetchReports().catch(() => undefined),
      refetchReportStats().catch(() => undefined),
    ]);
    setActionMsg({ type: 'success', text: 'Dashboard data refreshed.' });
  };

  const onDeletePost = async (postId: number | string) => {
    if (!window.confirm(`Delete post #${postId}? This cannot be undone.`)) return;
    try {
      const { data } = await deletePost({ variables: { postId: String(postId) } });
      if (data?.deletePost?.success) {
        setActionMsg({ type: 'success', text: `Post #${postId} deleted.` });
        refetchPosts();
      } else {
        setActionMsg({ type: 'error', text: data?.deletePost?.message || 'Delete failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Delete failed.' });
    }
  };

  const onDeleteProperty = async (propertyId: string) => {
    if (!window.confirm(`Delete property ${propertyId}? This cannot be undone.`)) return;
    try {
      const { data } = await deleteProperty({ variables: { propertyId: String(propertyId) } });
      if (data?.deleteProperty?.success) {
        setActionMsg({ type: 'success', text: `Property ${propertyId} deleted.` });
        await Promise.all([refetchProps(), refetchPendingProps()]);
      } else {
        setActionMsg({ type: 'error', text: data?.deleteProperty?.message || 'Property delete failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Property delete failed.' });
    }
  };

  const onApproveProperty = async (propertyId: string | number) => {
    try {
      const { data } = await approveProperty({ variables: { propertyId: String(propertyId) } });
      if (data?.approveProperty?.id) {
        setActionMsg({ type: 'success', text: `Property "${data.approveProperty.title}" approved.` });
        await Promise.all([refetchProps(), refetchPendingProps()]);
      } else {
        setActionMsg({ type: 'error', text: 'Approve failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Approve failed.' });
    }
  };

  const onRejectProperty = async (propertyId: string | number) => {
    const reason = window.prompt('Rejection reason (optional):', 'Rejected by admin') || 'Rejected by admin';
    try {
      const { data } = await rejectProperty({
        variables: { propertyId: String(propertyId), reason },
      });
      if (data?.rejectProperty?.id) {
        setActionMsg({ type: 'success', text: `Property "${data.rejectProperty.title}" rejected.` });
        await Promise.all([refetchProps(), refetchPendingProps()]);
      } else {
        setActionMsg({ type: 'error', text: 'Reject failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Reject failed.' });
    }
  };

  const onUpdateReport = async (reportId: string, status: 'RESOLVED' | 'REJECTED') => {
    const label = status === 'RESOLVED' ? 'resolve' : 'dismiss';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} report ${reportId}?`)) return;
    try {
      const { data } = await updateReportStatus({
        variables: {
          reportId: String(reportId),
          status,
          reviewedBy: user?.email || String(user?.id || 'admin'),
          actionTaken: status === 'RESOLVED' ? 'RESOLVED' : 'DISMISSED',
          actionNote: status === 'RESOLVED' ? 'Resolved by admin' : 'Dismissed by admin',
        },
      });
      if (data?.updateReportStatus?.success) {
        setActionMsg({ type: 'success', text: `Report ${reportId} ${status === 'RESOLVED' ? 'resolved' : 'dismissed'}.` });
        refetchReports().catch(() => undefined);
        refetchReportStats().catch(() => undefined);
      } else {
        setActionMsg({ type: 'error', text: data?.updateReportStatus?.message || 'Update failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Update failed.' });
    }
  };

  const handleRoleChange = async (targetUser: any, nextRole: string) => {
    const current = (targetUser.role || '').toLowerCase();
    if (current === nextRole) return;
    if (String(user?.id) === String(targetUser.id) && nextRole !== 'admin') {
      setActionMsg({ type: 'error', text: 'You cannot remove your own admin role.' });
      return;
    }
    const name = userDisplayName(targetUser);
    if (
      !window.confirm(
        `Change ${name} to role "${nextRole}"? They must log out/in for JWT privileges to refresh.`
      )
    ) {
      return;
    }
    try {
      const { data } = await updateUserRole({
        variables: { userId: String(targetUser.id), role: toApiRole(nextRole) },
      });
      if (data?.updateUserRole?.id) {
        setActionMsg({
          type: 'success',
          text: `Updated ${data.updateUserRole.firstName} ${data.updateUserRole.lastName} → ${data.updateUserRole.role}`,
        });
        await refetchUsers();
      } else {
        setActionMsg({ type: 'error', text: 'Role update failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Role update failed.' });
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const navItem = (id: TabId, label: string, icon: React.ReactNode, badge?: number, badgeColor?: string) => {
    const active = tab === id;
    return (
      <Box
        key={id}
        component="button"
        onClick={() => navigateTab(id)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          width: '100%',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          px: 1.5,
          py: 1,
          mb: 0.5,
          borderRadius: '8px',
          bgcolor: active ? ACTIVE_NAV_BG : 'transparent',
          color: active ? ACTIVE_NAV_TEXT : 'rgba(255, 252, 240, 0.82)',
          fontFamily: FONT,
          fontWeight: active ? 700 : 500,
          fontSize: 14,
          transition: 'background-color 0.15s ease',
          '&:hover': { bgcolor: active ? ACTIVE_NAV_BG : 'rgba(255,255,255,0.08)' },
          '& .nav-icon': { opacity: active ? 1 : 0.75, fontSize: 20 },
        }}
      >
        <Box className="nav-icon" sx={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Box component="span" sx={{ flex: 1 }}>
          {label}
        </Box>
        {badge != null && badge > 0 && (
          <Box
            sx={{
              minWidth: 20,
              height: 20,
              px: 0.75,
              borderRadius: '10px',
              bgcolor: badgeColor || '#EF4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badge}
          </Box>
        )}
      </Box>
    );
  };

  const sidebarContent = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        bgcolor: SIDEBAR_BG,
        color: '#FFFBF0',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}
    >
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ZpcLogoMark size={40} showTagline={false} animateStroke={false} ink="light" />
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#FFFBF0', fontFamily: FONT }}>
            ZPC stats
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5 }}>
        <Typography
          sx={{
            px: 1.5,
            mb: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255, 252, 240, 0.55)',
          }}
        >
          DASHBOARDS
        </Typography>
        {navItem('overview', 'Overview', <DashboardOutlinedIcon />)}
        {navItem('users', 'Users', <PeopleAltIcon />)}
        {navItem('posts', 'Posts', <DynamicFeedIcon />)}
        {navItem('properties', 'Properties', <HomeWorkIcon />)}

        <Typography
          sx={{
            px: 1.5,
            mt: 2.5,
            mb: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255, 252, 240, 0.55)',
          }}
        >
          MODERATION
        </Typography>
        {navItem('reports', 'Reported Posts', <FlagOutlinedIcon />, pendingReportCount, '#EF4444')}
        {navItem('approvals', 'Approvals', <CheckCircleOutlineIcon />, pendingProperties.length, '#F59E0B')}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Tooltip title="Logout" placement="top">
          <Avatar
            onClick={handleLogout}
            src={user?.profilePhotoSignedUrl || user?.profilePhoto || undefined}
            sx={{
              width: 40,
              height: 40,
              bgcolor: ACTIVE_NAV_BG,
              color: ACTIVE_NAV_TEXT,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {(adminName || user?.email || 'A').charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 13,
              color: '#FFFBF0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {adminName}
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              color: 'rgba(255, 252, 240, 0.65)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  const renderOverview = () => (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5, alignItems: 'center' }}>
        <Chip
          label="Last 30 Days"
          sx={{ fontWeight: 600, bgcolor: '#fff', border: '1px solid #E2E8F0', fontFamily: FONT }}
        />
        <Button
          startIcon={<FilterListIcon />}
          variant="outlined"
          size="small"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#E2E8F0',
            color: '#475569',
            fontFamily: FONT,
          }}
        >
          Filters
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
        <KpiCard
          label="Total Users"
          value={stats.totalUsers}
          icon={<PeopleAltIcon sx={{ fontSize: 22 }} />}
          tileBg="#DBEAFE"
          tileColor="#2563EB"
        />
        <KpiCard
          label="Active Users"
          value={stats.activeUsers}
          hint={stats.liveUsers > 0 ? `+${stats.liveUsers} live online` : undefined}
          icon={<PeopleAltIcon sx={{ fontSize: 22 }} />}
          tileBg="#DCFCE7"
          tileColor="#16A34A"
        />
        <KpiCard
          label="Total Posts"
          value={stats.totalPosts}
          icon={<DynamicFeedIcon sx={{ fontSize: 22 }} />}
          tileBg="#F3E8FF"
          tileColor="#9333EA"
        />
        <KpiCard
          label="Properties Created"
          value={stats.totalProperties}
          icon={<HomeWorkIcon sx={{ fontSize: 22 }} />}
          tileBg="#FFEDD5"
          tileColor="#EA580C"
        />
        <KpiCard
          label="Reported Posts"
          value={stats.reportedPosts}
          icon={<FlagOutlinedIcon sx={{ fontSize: 22 }} />}
          tileBg="#FEE2E2"
          tileColor="#DC2626"
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box sx={{ ...whiteCardSx, p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 2, fontFamily: FONT }}>
            Total Posts Created by Day
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 180, px: 0.5 }}>
            {postsByDay.map((d) => (
              <Box
                key={d.label}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                  minWidth: 0,
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>{d.count}</Typography>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 36,
                    height: `${Math.max(4, (d.count / maxPostsDay) * 140)}px`,
                    bgcolor: '#00796B',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: '#94A3B8',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {d.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ ...whiteCardSx, p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 2, fontFamily: FONT }}>
            User Demographics
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Object.entries(stats.byRole)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => {
                const pct = stats.totalUsers ? (count / stats.totalUsers) * 100 : 0;
                return (
                  <Box key={role}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                        {role.replace(/_/g, ' ')}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{count}</Typography>
                    </Box>
                    <Box sx={{ height: 8, bgcolor: '#E2E8F0', borderRadius: 1, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${pct}%`,
                          height: '100%',
                          bgcolor: '#00796B',
                          borderRadius: 1,
                          minWidth: count > 0 ? 4 : 0,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            {Object.keys(stats.byRole).length === 0 && (
              <Typography sx={{ fontSize: 13, color: '#64748B' }}>No user data loaded.</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 2 }}>
        <Box sx={{ ...whiteCardSx, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', fontFamily: FONT }}>
              Property Suggestions
            </Typography>
            {pendingProperties.length > 0 && (
              <Chip
                size="small"
                label={`${pendingProperties.length} pending`}
                sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: 11 }}
              />
            )}
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: FONT,
                '& th, & td': {
                  textAlign: 'left',
                  px: 2.5,
                  py: 1.25,
                  fontSize: 13,
                  borderBottom: '1px solid #F1F5F9',
                },
                '& th': { fontWeight: 700, color: '#64748B', fontSize: 11, letterSpacing: '0.04em' },
                '& tbody tr': listRowHoverSx,
              }}
            >
              <thead>
                <tr>
                  <th>USER</th>
                  <th>PROPERTY NAME</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingProperties.slice(0, 8).map((p: any) => {
                  const owner = userById.get(propOwnerId(p));
                  return (
                    <tr key={propId(p)}>
                      <td>
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{userDisplayName(owner)}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>#{propOwnerId(p)}</Typography>
                      </td>
                      <td>
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.title || 'Untitled'}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{p.status}</Typography>
                      </td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={approvingProperty || rejectingProperty}
                            onClick={() => onApproveProperty(propId(p))}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: 12,
                              bgcolor: '#00796B',
                              '&:hover': { bgcolor: '#00695C' },
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={approvingProperty || rejectingProperty}
                            onClick={() => onRejectProperty(propId(p))}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                          >
                            Reject
                          </Button>
                        </Box>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
            {pendingProperties.length === 0 && (
              <Typography sx={{ p: 3, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                No pending property suggestions.
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            ...whiteCardSx,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 220,
            textAlign: 'center',
          }}
        >
          <BarChartIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 0.5, fontFamily: FONT }}>
            Custom Reports Widget
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2, maxWidth: 240 }}>
            Build custom analytics widgets for your dashboard.
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => setActionMsg({ type: 'success', text: 'Coming soon — custom report widgets.' })}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#E2E8F0',
              color: '#475569',
              fontFamily: FONT,
            }}
          >
            + Add Widget
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const searchFieldSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flex: 1,
    minWidth: 180,
    maxWidth: 360,
    px: 1.5,
    py: 0.75,
    borderRadius: '10px',
    bgcolor: '#fff',
    border: '1px solid #E2E8F0',
  };

  const renderUsers = () => (
    <Box sx={{ ...whiteCardSx, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ ...searchFieldSx, maxWidth: 320 }}>
          <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
          <InputBase
            fullWidth
            placeholder="Search name, email, phone, role…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            sx={{ fontSize: 14, fontFamily: FONT }}
          />
        </Box>
        <Select
          size="small"
          value={roleFilter}
          onChange={(e) => setRoleFilter(String(e.target.value))}
          sx={{ minWidth: 140, borderRadius: '8px', bgcolor: '#fff', fontFamily: FONT }}
        >
          <MenuItem value="all">All roles</MenuItem>
          {roleOptions.map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={userStatusFilter}
          onChange={(e) => setUserStatusFilter(String(e.target.value))}
          sx={{ minWidth: 140, borderRadius: '8px', bgcolor: '#fff', fontFamily: FONT }}
        >
          <MenuItem value="all">All status</MenuItem>
          <MenuItem value="online">Live online</MenuItem>
          <MenuItem value="offline">Offline</MenuItem>
          <MenuItem value="active">Account active</MenuItem>
          <MenuItem value="inactive">Account inactive</MenuItem>
        </Select>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={layoutMode}
          onChange={(_, v) => v && setLayoutMode(v)}
          sx={{
            bgcolor: '#F1F5F9',
            borderRadius: '8px',
            '& .MuiToggleButton-root': { px: 1.1, border: 'none', color: '#64748B' },
            '& .Mui-selected': { bgcolor: '#fff !important', color: '#00796B !important' },
          }}
        >
          <ToggleButton value="list" aria-label="List view">
            <ViewListIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="Grid view">
            <GridViewIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Divider />
      {layoutMode === 'list' ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: FONT,
              '& th, & td': {
                textAlign: 'left',
                px: 2,
                py: 1.25,
                fontSize: 13,
                borderBottom: '1px solid #F1F5F9',
              },
              '& th': { fontWeight: 700, color: '#64748B', bgcolor: '#F8FAFC', fontSize: 11 },
              '& tbody tr': listRowHoverSx,
            }}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Role</th>
                <th>Live</th>
                <th>Account</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: any) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{userDisplayName(u)}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>{u.email}</Typography>
                  </td>
                  <td>
                    <Select
                      size="small"
                      value={toUiRole(u.role)}
                      disabled={updatingRole}
                      onChange={(e) => handleRoleChange(u, String(e.target.value))}
                      sx={{ minWidth: 140, fontWeight: 600, fontSize: 12, borderRadius: '8px' }}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Chip
                      size="small"
                      label={isLiveOnline(u) ? 'Online' : 'Offline'}
                      color={isLiveOnline(u) ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </td>
                  <td>
                    <Chip
                      size="small"
                      label={accountIsActive(u) ? 'Active' : 'Inactive'}
                      color={accountIsActive(u) ? 'success' : 'default'}
                      variant={accountIsActive(u) ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600 }}
                    />
                  </td>
                  <td>{fmtDate(u.createdAt, u)}</td>
                  <td>
                    <Button
                      size="small"
                      sx={{ textTransform: 'none', fontWeight: 600, color: '#00796B' }}
                      onClick={() => navigate('/profile', { state: { userId: u.id } })}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
          {filteredUsers.length === 0 && (
            <Typography sx={{ p: 3, textAlign: 'center', color: '#64748B' }}>No users match.</Typography>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            p: 2,
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          }}
        >
          {filteredUsers.map((u: any) => (
            <Box
              key={u.id}
              sx={{
                ...whiteCardSx,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                border: '1px solid #E2E8F0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={u.profilePhotoSignedUrl || u.profilePhoto || undefined}
                    sx={{ width: 44, height: 44, bgcolor: '#00796B', fontWeight: 700 }}
                  >
                    {(u.firstName || u.email || '?').charAt(0).toUpperCase()}
                  </Avatar>
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: isLiveOnline(u) ? '#16A34A' : '#94A3B8',
                      border: '2px solid #fff',
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userDisplayName(u)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>#{u.id}</Typography>
              </Box>
              <Select
                size="small"
                fullWidth
                value={toUiRole(u.role)}
                disabled={updatingRole}
                onChange={(e) => handleRoleChange(u, String(e.target.value))}
                sx={{ fontWeight: 600, fontSize: 12, borderRadius: '8px' }}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip size="small" label={isLiveOnline(u) ? 'Online' : 'Offline'} color={isLiveOnline(u) ? 'success' : 'default'} sx={{ fontWeight: 600 }} />
                <Chip
                  size="small"
                  label={accountIsActive(u) ? 'Active' : 'Inactive'}
                  color={accountIsActive(u) ? 'success' : 'default'}
                  variant={accountIsActive(u) ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                Joined {fmtDate(u.createdAt, u)}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#E2E8F0', color: '#00796B' }}
                onClick={() => navigate('/profile', { state: { userId: u.id } })}
              >
                Open profile
              </Button>
            </Box>
          ))}
          {filteredUsers.length === 0 && (
            <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: '#64748B' }}>No users match.</Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const renderProperties = () => (
    <Box sx={{ ...whiteCardSx, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ ...searchFieldSx, maxWidth: 320 }}>
          <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
          <InputBase
            fullWidth
            placeholder="Search title, city, location…"
            value={propertySearch}
            onChange={(e) => setPropertySearch(e.target.value)}
            sx={{ fontSize: 14, fontFamily: FONT }}
          />
        </Box>
        <Select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(String(e.target.value))}
          sx={{ minWidth: 140, borderRadius: '8px', bgcolor: '#fff', fontFamily: FONT }}
        >
          <MenuItem value="all">All status</MenuItem>
          <MenuItem value="ACTIVE">ACTIVE</MenuItem>
          <MenuItem value="INACTIVE">INACTIVE</MenuItem>
          <MenuItem value="SOLD">SOLD</MenuItem>
          <MenuItem value="RENTED">RENTED</MenuItem>
          <MenuItem value="PENDING">PENDING</MenuItem>
          <MenuItem value="DRAFT">DRAFT</MenuItem>
        </Select>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={layoutMode}
          onChange={(_, v) => v && setLayoutMode(v)}
          sx={{
            bgcolor: '#F1F5F9',
            borderRadius: '8px',
            '& .MuiToggleButton-root': { px: 1.1, border: 'none', color: '#64748B' },
            '& .Mui-selected': { bgcolor: '#fff !important', color: '#00796B !important' },
          }}
        >
          <ToggleButton value="list" aria-label="List view">
            <ViewListIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="Grid view">
            <GridViewIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Divider />
      {layoutMode === 'list' ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: FONT,
              '& th, & td': {
                textAlign: 'left',
                px: 2,
                py: 1.25,
                fontSize: 13,
                borderBottom: '1px solid #F1F5F9',
              },
              '& th': { fontWeight: 700, color: '#64748B', bgcolor: '#F8FAFC', fontSize: 11 },
              '& tbody tr': listRowHoverSx,
            }}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>Listing</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
                <th>Views</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((p: any) => (
                <tr key={propId(p)}>
                  <td>{propId(p)}</td>
                  <td>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.title}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                      {p.city || p.location || '—'} · owner #{propOwnerId(p)}
                    </Typography>
                  </td>
                  <td>{p.propertyType}</td>
                  <td>{fmtMoney(p.price)}</td>
                  <td>
                    <Chip size="small" label={p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE')} sx={{ fontWeight: 600 }} />
                  </td>
                  <td>{p.viewCount ?? 0}</td>
                  <td>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        sx={{ textTransform: 'none', fontWeight: 600, color: '#00796B' }}
                        onClick={() => navigate(`/property/${propId(p)}`)}
                      >
                        Open
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deletingProperty}
                        onClick={() => onDeleteProperty(String(propId(p)))}
                        title="Delete property"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
          {filteredProperties.length === 0 && (
            <Typography sx={{ p: 3, textAlign: 'center', color: '#64748B' }}>No properties match.</Typography>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            p: 2,
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          }}
        >
          {filteredProperties.map((p: any) => (
            <Box key={propId(p)} sx={{ ...whiteCardSx, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{p.title}</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                {p.city || p.location || '—'} · #{propId(p)}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                <Chip size="small" label={p.propertyType || '—'} sx={{ fontWeight: 600 }} />
                <Chip size="small" label={p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE')} sx={{ fontWeight: 600 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#00796B' }}>{fmtMoney(p.price)}</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>{p.viewCount ?? 0} views · owner #{propOwnerId(p)}</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, mt: 'auto', pt: 0.5 }}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#E2E8F0', color: '#00796B' }}
                  onClick={() => navigate(`/property/${propId(p)}`)}
                >
                  Open
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  disabled={deletingProperty}
                  onClick={() => onDeleteProperty(String(propId(p)))}
                  title="Delete property"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
          {filteredProperties.length === 0 && (
            <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: '#64748B' }}>No properties match.</Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const renderPosts = () => (
    <Box sx={{ ...whiteCardSx, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={layoutMode}
          onChange={(_, v) => v && setLayoutMode(v)}
          sx={{
            bgcolor: '#F1F5F9',
            borderRadius: '8px',
            '& .MuiToggleButton-root': { px: 1.1, border: 'none', color: '#64748B' },
            '& .Mui-selected': { bgcolor: '#fff !important', color: '#00796B !important' },
          }}
        >
          <ToggleButton value="list" aria-label="List view">
            <ViewListIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="Grid view">
            <GridViewIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Divider />
      {layoutMode === 'list' ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: FONT,
              '& th, & td': {
                textAlign: 'left',
                px: 2,
                py: 1.25,
                fontSize: 13,
                borderBottom: '1px solid #F1F5F9',
                verticalAlign: 'top',
              },
              '& th': { fontWeight: 700, color: '#64748B', bgcolor: '#F8FAFC', fontSize: 11 },
              '& tbody tr': listRowHoverSx,
            }}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>Post</th>
                <th>Author</th>
                <th>Engagement</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td style={{ maxWidth: 320 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.title || 'Untitled'}</Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: '#64748B',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.content}
                    </Typography>
                  </td>
                  <td>
                    {p.userFirstName} {p.userLastName}
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>#{propOwnerId(p)}</Typography>
                  </td>
                  <td>
                    {p.likeCount || 0} likes · {p.commentCount || 0} comments
                    {(p.reportCount || 0) > 0 && (
                      <Typography sx={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                        {p.reportCount} reports
                      </Typography>
                    )}
                  </td>
                  <td>{fmtDate(p.createdAt)}</td>
                  <td>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={deletingPost}
                      onClick={() => onDeletePost(p.id)}
                      title="Delete post"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
          {posts.length === 0 && (
            <Typography sx={{ p: 3, textAlign: 'center', color: '#64748B' }}>No posts found.</Typography>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            p: 2,
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          }}
        >
          {posts.map((p: any) => (
            <Box key={p.id} sx={{ ...whiteCardSx, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{p.title || 'Untitled'}</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>#{p.id}</Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 12,
                  color: '#64748B',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: 48,
                }}
              >
                {p.content}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                {p.userFirstName} {p.userLastName}{' '}
                <Box component="span" sx={{ color: '#94A3B8', fontWeight: 500 }}>#{propOwnerId(p)}</Box>
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                {p.likeCount || 0} likes · {p.commentCount || 0} comments
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                <Typography sx={{ fontSize: 11, color: '#64748B' }}>{fmtDate(p.createdAt)}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  disabled={deletingPost}
                  onClick={() => onDeletePost(p.id)}
                  title="Delete post"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
          {posts.length === 0 && (
            <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: '#64748B' }}>No posts found.</Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const renderReports = () => (
    <Box sx={{ ...whiteCardSx, overflow: 'hidden' }}>
      {reportsError && (
        <Alert severity="info" sx={{ m: 2, borderRadius: 2 }}>
          Report data unavailable — you may lack permission or the reports service is offline.
        </Alert>
      )}
      {reportsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#00796B' }} />
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: FONT,
              '& th, & td': {
                textAlign: 'left',
                px: 2,
                py: 1.25,
                fontSize: 13,
                borderBottom: '1px solid #F1F5F9',
                verticalAlign: 'top',
              },
              '& th': { fontWeight: 700, color: '#64748B', bgcolor: '#F8FAFC', fontSize: 11 },
              '& tbody tr': listRowHoverSx,
            }}
          >
            <thead>
              <tr>
                <th>Report</th>
                <th>Entity</th>
                <th>Reason</th>
                <th>Reporter</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{r.reportCode || r.id}</Typography>
                    <Chip size="small" label={r.status} sx={{ fontWeight: 600, mt: 0.5 }} />
                  </td>
                  <td>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.entityType}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>ID: {r.entityId}</Typography>
                  </td>
                  <td>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.reasonCode || '—'}</Typography>
                    {r.description && (
                      <Typography sx={{ fontSize: 12, color: '#64748B', maxWidth: 240 }}>{r.description}</Typography>
                    )}
                  </td>
                  <td>
                    {userDisplayName(userById.get(String(r.reportedUserId || r.reportedBy)))}
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{r.reportedBy}</Typography>
                  </td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={updatingReport}
                        onClick={() => onUpdateReport(r.id, 'RESOLVED')}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 12,
                          bgcolor: '#00796B',
                          '&:hover': { bgcolor: '#00695C' },
                        }}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={updatingReport}
                        onClick={() => onUpdateReport(r.id, 'REJECTED')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      >
                        Dismiss
                      </Button>
                    </Box>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
          {reports.length === 0 && !reportsError && (
            <Typography sx={{ p: 3, textAlign: 'center', color: '#64748B' }}>No pending reports.</Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const renderApprovals = () => (
    <Box sx={{ ...whiteCardSx, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', fontFamily: FONT }}>
          Pending Property Approvals
        </Typography>
        {pendingProperties.length > 0 && (
          <Chip
            size="small"
            label={`${pendingProperties.length} pending`}
            sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: 11 }}
          />
        )}
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: FONT,
            '& th, & td': {
              textAlign: 'left',
              px: 2.5,
              py: 1.25,
              fontSize: 13,
              borderBottom: '1px solid #F1F5F9',
            },
            '& th': { fontWeight: 700, color: '#64748B', fontSize: 11, bgcolor: '#F8FAFC' },
            '& tbody tr': listRowHoverSx,
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>USER</th>
              <th>PROPERTY NAME</th>
              <th>STATUS</th>
              <th>CREATED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {pendingProperties.map((p: any) => {
              const owner = userById.get(propOwnerId(p));
              return (
                <tr key={propId(p)}>
                  <td>{propId(p)}</td>
                  <td>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{userDisplayName(owner)}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>#{propOwnerId(p)}</Typography>
                  </td>
                  <td>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.title || 'Untitled'}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                      {p.city || p.location || '—'} · {fmtMoney(p.price)}
                    </Typography>
                  </td>
                  <td>
                    <Chip size="small" label={p.status} sx={{ fontWeight: 600 }} />
                  </td>
                  <td>{fmtDate(p.createdAt)}</td>
                  <td>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={approvingProperty || rejectingProperty}
                        onClick={() => onApproveProperty(propId(p))}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 12,
                          bgcolor: '#00796B',
                          '&:hover': { bgcolor: '#00695C' },
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={approvingProperty || rejectingProperty}
                        onClick={() => onRejectProperty(propId(p))}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      >
                        Reject
                      </Button>
                    </Box>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Box>
        {pendingProperties.length === 0 && (
          <Typography sx={{ p: 3, textAlign: 'center', color: '#64748B' }}>No pending approvals.</Typography>
        )}
      </Box>
    </Box>
  );

  const renderContent = () => {
    if (loading && tab !== 'reports') {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00796B' }} />
        </Box>
      );
    }
    switch (tab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUsers();
      case 'posts':
        return renderPosts();
      case 'properties':
        return renderProperties();
      case 'reports':
        return renderReports();
      case 'approvals':
        return renderApprovals();
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: MAIN_BG, fontFamily: FONT }}>
      {!isMobile && (
        <Box
          component="aside"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            zIndex: 30,
          }}
        >
          {sidebarContent}
        </Box>
      )}

      <Drawer
        open={isMobile && sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        {sidebarContent}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            bgcolor: MAIN_BG,
            borderBottom: '1px solid #E2E8F0',
            px: { xs: 2, sm: 3 },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {isMobile && (
              <IconButton onClick={() => setSidebarOpen(true)} sx={{ color: '#334155' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.15rem', sm: '1.35rem' },
                color: '#0F172A',
                fontFamily: FONT,
                mr: 'auto',
              }}
            >
              {PAGE_TITLES[tab]}
            </Typography>

            <Box sx={searchFieldSx}>
              <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
              <InputBase
                fullWidth
                placeholder="Search…"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                sx={{ fontSize: 14, fontFamily: FONT }}
              />
            </Box>

            <Tooltip title="Refresh data">
              <IconButton onClick={refreshAll} sx={{ color: '#64748B' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications (coming soon)">
              <IconButton sx={{ color: '#64748B' }}>
                <Badge variant="dot" color="error" overlap="circular">
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton sx={{ color: '#64748B' }}>
                <SettingsOutlinedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} sx={{ color: '#64748B' }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>

            <Button
              startIcon={<HomeIcon />}
              onClick={() => navigate('/home')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#00796B',
                fontFamily: FONT,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              App home
            </Button>
          </Box>
        </Box>

        <Box component="main" sx={{ flex: 1, px: { xs: 2, sm: 3 }, py: 3 }}>
          {(usersError || propsError || pendingPropsError || postsError) && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Some admin data failed to load. Showing whatever is available.
            </Alert>
          )}
          {actionMsg && (
            <Alert severity={actionMsg.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setActionMsg(null)}>
              {actionMsg.text}
            </Alert>
          )}
          <TabEnter tabKey={tab}>{renderContent()}</TabEnter>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
