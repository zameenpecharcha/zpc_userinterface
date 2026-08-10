import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import { useAuth } from '../../contexts/AuthContext';
import {
  ADMIN_DELETE_POST,
  ADMIN_DELETE_PROPERTY,
  ADMIN_POSTS,
  ADMIN_PROPERTIES,
  ADMIN_UPDATE_USER_ROLE,
  ADMIN_USERS,
} from '../../graphql/admin';
import AdminBackground from './AdminBackground';
import { formatDateTime, isRecentlyActive } from '../../utils/datetime';
import { MATTE_HEADER } from '../../theme/surfaces';

type TabId = 'overview' | 'users' | 'properties' | 'posts';
type LayoutMode = 'list' | 'grid';

const ACCENT = '#16302A';

const ASSIGNABLE_ROLES = ['admin', 'agent', 'builder', 'general_user'] as const;

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

const listRowHoverSx = {
  transition: 'background-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease',
  '&:hover': {
    bgcolor: 'rgba(30,58,72,0.06)',
    boxShadow: 'inset 3px 0 0 #16302A',
    transform: 'translateX(2px)',
  },
};

const gridCardHoverSx = {
  transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease, border-color 0.25s ease',
  border: '1px solid rgba(22,48,42,0.18)',
  bgcolor: 'rgba(235,230,212,0.72)',
  borderRadius: '14px',
  '&:hover': {
    transform: 'translateY(-4px) scale(1.015)',
    boxShadow: '0 14px 32px rgba(30,58,72,0.14)',
    borderColor: 'rgba(30,58,72,0.28)',
  },
};

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

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  accent?: string;
}> = ({ label, value, hint, icon, accent = ACCENT }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: '16px',
      bgcolor: 'rgba(255,252,248,0.78)',
      border: '1px solid rgba(22,48,42,0.16)',
      boxShadow: '0 10px 28px rgba(60,45,30,0.08)',
      backdropFilter: 'blur(10px)',
      minHeight: 118,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography
        sx={{
          fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#3A4540',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '12px',
          bgcolor: accent,
          color: '#EBE6D4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
    </Box>
    <Typography
      sx={{
        fontFamily: '"Libre Caslon Text", Georgia, serif',
        fontWeight: 600,
        fontSize: '2rem',
        color: '#0A1210',
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
    {hint && (
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#3A4540' }}>{hint}</Typography>
    )}
  </Box>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
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
    variables: { query: '' },
    fetchPolicy: 'network-only',
  });

  const {
    data: postsData,
    loading: postsLoading,
    refetch: refetchPosts,
    error: postsError,
  } = useQuery(ADMIN_POSTS, {
    variables: { page: 1, limit: 100 },
    fetchPolicy: 'network-only',
  });

  const [deletePost, { loading: deletingPost }] = useMutation(ADMIN_DELETE_POST);
  const [deleteProperty, { loading: deletingProperty }] = useMutation(ADMIN_DELETE_PROPERTY);
  const [updateUserRole, { loading: updatingRole }] = useMutation(ADMIN_UPDATE_USER_ROLE);

  const users = usersData?.users || [];
  const properties = propsData?.searchProperties || [];
  const posts = postsData?.searchPosts || [];
  const loading = usersLoading || propsLoading || postsLoading;

  const stats = useMemo(() => {
    const activeUsers = users.filter((u: any) => accountIsActive(u)).length;
    const inactiveUsers = users.length - activeUsers;
    const liveUsers = users.filter((u: any) => accountIsActive(u) && isLiveOnline(u)).length;
    const activeProps = properties.filter(
      (p: any) => p.isActive !== false && String(p.status || '').toUpperCase() === 'ACTIVE'
    ).length;
    const byRole: Record<string, number> = {};
    users.forEach((u: any) => {
      const r = (u.role || 'unknown').toLowerCase();
      byRole[r] = (byRole[r] || 0) + 1;
    });
    const byPropType: Record<string, number> = {};
    properties.forEach((p: any) => {
      const t = p.propertyType || 'OTHER';
      byPropType[t] = (byPropType[t] || 0) + 1;
    });
    return {
      totalUsers: users.length,
      activeUsers,
      inactiveUsers,
      liveUsers,
      totalProperties: properties.length,
      activeProps,
      totalPosts: posts.length,
      totalLikes: posts.reduce((s: number, p: any) => s + (p.likeCount || 0), 0),
      totalComments: posts.reduce((s: number, p: any) => s + (p.commentCount || 0), 0),
      byRole,
      byPropType,
    };
  }, [users, properties, posts]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
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
  }, [users, userSearch, roleFilter, userStatusFilter]);

  const filteredProperties = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    return properties.filter((p: any) => {
      if (statusFilter !== 'all' && String(p.status || '').toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.location || ''} ${p.city || ''} ${p.propertyType || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [properties, propertySearch, statusFilter]);

  const refreshAll = async () => {
    setActionMsg(null);
    await Promise.all([refetchUsers(), refetchProps(), refetchPosts()]);
    setActionMsg({ type: 'success', text: 'Dashboard data refreshed from live services.' });
  };

  const onDeletePost = async (postId: number) => {
    if (!window.confirm(`Delete post #${postId}? This cannot be undone.`)) return;
    try {
      const { data } = await deletePost({ variables: { postId } });
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
      if (data?.deleteProperty) {
        setActionMsg({ type: 'success', text: `Property ${propertyId} deleted.` });
        refetchProps();
      } else {
        setActionMsg({ type: 'error', text: 'Property delete failed.' });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message || 'Property delete failed.' });
    }
  };

  const handleRoleChange = async (targetUser: any, nextRole: string) => {
    const current = (targetUser.role || '').toLowerCase();
    if (current === nextRole) return;
    if (String(user?.id) === String(targetUser.id) && nextRole !== 'admin') {
      setActionMsg({ type: 'error', text: 'You cannot remove your own admin role.' });
      return;
    }
    const name = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
    if (
      !window.confirm(
        `Change ${name} to role "${nextRole}"? They must log out/in for JWT privileges to refresh.`
      )
    ) {
      return;
    }
    try {
      const { data } = await updateUserRole({
        variables: { userId: parseInt(String(targetUser.id), 10), role: nextRole },
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

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u: any) => set.add((u.role || 'unknown').toLowerCase()));
    return Array.from(set).sort();
  }, [users]);

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', color: '#0A1210' }}>
      <AdminBackground />

      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          zIndex: 20,
          ...MATTE_HEADER,
        }}
      >
        <Toolbar
          sx={{
            gap: 1,
            flexWrap: 'wrap',
            py: 0.5,
            width: '100%',
            maxWidth: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4, lg: 5 },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography
              sx={{
                fontFamily: '"Libre Caslon Text", Georgia, serif',
                fontWeight: 600,
                fontSize: '1.35rem',
                color: '#EBE6D4',
                lineHeight: 1.1,
              }}
            >
              ZPC Admin
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(235,230,212,0.78)' }}>
              Platform operations · {user?.email}
            </Typography>
          </Box>
          <IconButton onClick={refreshAll} title="Refresh" sx={{ color: '#EBE6D4' }}>
            <RefreshIcon />
          </IconButton>
          <Button
            startIcon={<HomeIcon />}
            onClick={() => navigate('/home')}
            sx={{ textTransform: 'none', fontWeight: 700, color: '#EBE6D4' }}
          >
            App home
          </Button>
          <Button
            startIcon={<LogoutIcon />}
            onClick={() => {
              clearAuth();
              navigate('/');
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(22, 48, 42, 0.72)',
              color: '#EBE6D4',
              borderRadius: '10px',
              px: 1.5,
              border: '1px solid rgba(235,230,212,0.28)',
              '&:hover': { bgcolor: 'rgba(15, 34, 28, 0.88)' },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '100%', mx: 'auto', px: { xs: 2, sm: 3, md: 4, lg: 5 }, py: 3 }}>
        {(usersError || propsError || postsError) && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Some admin data failed to load. Showing whatever is available from the live database services.
          </Alert>
        )}
        {actionMsg && (
          <Alert
            severity={actionMsg.type}
            sx={{ mb: 2, borderRadius: 2 }}
            onClose={() => setActionMsg(null)}
          >
            {actionMsg.text}
          </Alert>
        )}

        <Box
          sx={{
            mb: 2.5,
            p: 0.5,
            borderRadius: '999px',
            bgcolor: 'rgba(235,230,212,0.35)',
            backdropFilter: 'blur(12px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(12px) saturate(1.15)',
            border: '1px solid rgba(22,48,42,0.2)',
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 42,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                minHeight: 34,
                borderRadius: 999,
                mx: 0.25,
                color: '#3A4540',
              },
              '& .Mui-selected': {
                color: '#EBE6D4 !important',
                bgcolor: 'rgba(22,48,42,0.88) !important',
              },
            }}
          >
            <Tab value="overview" label="Overview" />
            <Tab value="users" label={`Users (${stats.totalUsers})`} />
            <Tab value="properties" label={`Properties (${stats.totalProperties})`} />
            <Tab value="posts" label={`Posts (${stats.totalPosts})`} />
          </Tabs>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: ACCENT }} />
          </Box>
        )}

        {!loading && tab === 'overview' && (
          <Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              <KpiCard
                label="Users"
                value={stats.totalUsers}
                hint={`${stats.liveUsers} live · ${stats.activeUsers} active · ${stats.inactiveUsers} inactive`}
                icon={<PeopleAltIcon sx={{ fontSize: 20 }} />}
              />
              <KpiCard
                label="Properties"
                value={stats.totalProperties}
                hint={`${stats.activeProps} listed active`}
                icon={<HomeWorkIcon sx={{ fontSize: 20 }} />}
                accent="#16302A"
              />
              <KpiCard
                label="Posts"
                value={stats.totalPosts}
                hint={`${stats.totalLikes} likes · ${stats.totalComments} comments`}
                icon={<DynamicFeedIcon sx={{ fontSize: 20 }} />}
                accent="#3A4540"
              />
              <KpiCard
                label="Engagement"
                value={stats.totalLikes + stats.totalComments}
                hint="Likes + comments across feed"
                icon={<DynamicFeedIcon sx={{ fontSize: 20 }} />}
                accent="#0F221C"
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  p: 2.25,
                  borderRadius: '16px',
                  bgcolor: 'rgba(255,252,248,0.8)',
                  border: '1px solid rgba(22,48,42,0.16)',
                }}
              >
                <Typography sx={{ fontWeight: 800, mb: 1.5, color: '#0A1210' }}>Users by role</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(stats.byRole).map(([role, count]) => (
                    <Chip
                      key={role}
                      label={`${role}: ${count}`}
                      sx={{
                        fontWeight: 700,
                        bgcolor: role === 'admin' ? 'rgba(30,58,72,0.12)' : 'rgba(143,169,152,0.35)',
                        color: ACCENT,
                      }}
                    />
                  ))}
                  {Object.keys(stats.byRole).length === 0 && (
                    <Typography sx={{ color: '#3A4540', fontSize: 13 }}>No users loaded.</Typography>
                  )}
                </Box>
              </Box>
              <Box
                sx={{
                  p: 2.25,
                  borderRadius: '16px',
                  bgcolor: 'rgba(255,252,248,0.8)',
                  border: '1px solid rgba(22,48,42,0.16)',
                }}
              >
                <Typography sx={{ fontWeight: 800, mb: 1.5, color: '#0A1210' }}>Properties by type</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(stats.byPropType).map(([type, count]) => (
                    <Chip
                      key={type}
                      label={`${type}: ${count}`}
                      sx={{ fontWeight: 700, bgcolor: 'rgba(15,118,110,0.12)', color: '#16302A' }}
                    />
                  ))}
                  {Object.keys(stats.byPropType).length === 0 && (
                    <Typography sx={{ color: '#3A4540', fontSize: 13 }}>No properties loaded.</Typography>
                  )}
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255,252,248,0.8)',
                border: '1px solid rgba(22,48,42,0.16)',
              }}
            >
              <Typography sx={{ fontWeight: 800, mb: 1, color: '#0A1210' }}>Admin capabilities</Typography>
              <Typography sx={{ fontSize: 13, color: '#3A4540', lineHeight: 1.55 }}>
                This console reads live data from user, property, and post services. Use the Users tab to change roles
                (admin, agent, builder, general_user). Role changes apply on the next login. You can also open app pages
                or remove abusive posts/listings from the other tabs.
              </Typography>
            </Box>
          </Box>
        )}

        {!loading && tab === 'users' && (
          <Box
            sx={{
              borderRadius: '16px',
              bgcolor: 'rgba(235,230,212,0.82)',
              border: '1px solid rgba(22,48,42,0.16)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                  minWidth: 200,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: '12px',
                  bgcolor: 'rgba(235,230,212,0.78)',
                  border: '1px solid rgba(22,48,42,0.18)',
                }}
              >
                <SearchIcon sx={{ color: '#A89F84', fontSize: 20 }} />
                <InputBase
                  fullWidth
                  placeholder="Search name, email, phone, role…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 14 }}
                />
              </Box>
              <Select
                size="small"
                value={roleFilter}
                onChange={(e) => setRoleFilter(String(e.target.value))}
                sx={{ minWidth: 140, borderRadius: '10px', bgcolor: 'rgba(235, 230, 212,0.8)' }}
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
                sx={{ minWidth: 140, borderRadius: '10px', bgcolor: 'rgba(235, 230, 212,0.8)' }}
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
                  bgcolor: 'rgba(235, 230, 212,0.8)',
                  borderRadius: '10px',
                  '& .MuiToggleButton-root': { px: 1.1, border: 'none', color: '#3A4540' },
                  '& .Mui-selected': { bgcolor: 'rgba(30,58,72,0.12) !important', color: `${ACCENT} !important` },
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
                  '& th, & td': {
                    textAlign: 'left',
                    px: 1.5,
                    py: 1.15,
                    fontSize: 13,
                    borderBottom: '1px solid rgba(90,70,50,0.08)',
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  },
                  '& th': { fontWeight: 800, color: '#3A4540', bgcolor: 'rgba(246,242,235,0.7)' },
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
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                          {u.firstName} {u.lastName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#3A4540' }}>{u.email}</Typography>
                      </td>
                      <td>
                        <Select
                          size="small"
                          value={
                            ASSIGNABLE_ROLES.includes((u.role || '').toLowerCase() as any)
                              ? (u.role || '').toLowerCase()
                              : 'general_user'
                          }
                          disabled={updatingRole}
                          onChange={(e) => handleRoleChange(u, String(e.target.value))}
                          sx={{
                            minWidth: 140,
                            fontWeight: 700,
                            fontSize: 12,
                            borderRadius: '10px',
                            bgcolor: 'rgba(235, 230, 212,0.9)',
                          }}
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
                          sx={{ fontWeight: 700 }}
                        />
                      </td>
                      <td>
                        <Chip
                          size="small"
                          label={accountIsActive(u) ? 'Active' : 'Inactive'}
                          color={accountIsActive(u) ? 'success' : 'default'}
                          variant={accountIsActive(u) ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 700 }}
                        />
                      </td>
                      <td>{fmtDate(u.createdAt, u)}</td>
                      <td>
                        <Button
                          size="small"
                          sx={{ textTransform: 'none', fontWeight: 700 }}
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
                <Typography sx={{ p: 3, textAlign: 'center', color: '#3A4540' }}>No users match.</Typography>
              )}
            </Box>
            ) : (
            <Box
              sx={{
                p: 1.5,
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
              }}
            >
              {filteredUsers.map((u: any) => (
                <Box key={u.id} sx={{ ...gridCardHoverSx, p: 1.75, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        src={u.profilePhotoSignedUrl || u.profilePhoto || undefined}
                        sx={{ width: 44, height: 44, bgcolor: ACCENT, fontWeight: 800 }}
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
                          bgcolor: isLiveOnline(u) ? '#16302A' : '#A89F84',
                          border: '2px solid #EBE6D4',
                        }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.firstName} {u.lastName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#3A4540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#A89F84' }}>#{u.id}</Typography>
                  </Box>
                  <Select
                    size="small"
                    fullWidth
                    value={
                      ASSIGNABLE_ROLES.includes((u.role || '').toLowerCase() as any)
                        ? (u.role || '').toLowerCase()
                        : 'general_user'
                    }
                    disabled={updatingRole}
                    onChange={(e) => handleRoleChange(u, String(e.target.value))}
                    sx={{ fontWeight: 700, fontSize: 12, borderRadius: '10px' }}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={isLiveOnline(u) ? 'Online' : 'Offline'}
                      color={isLiveOnline(u) ? 'success' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={accountIsActive(u) ? 'Active' : 'Inactive'}
                      color={accountIsActive(u) ? 'success' : 'default'}
                      variant={accountIsActive(u) ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: '#3A4540', fontWeight: 600 }}>
                    Last login: {fmtDate(u.lastLoginAt, u)} · Joined {fmtDate(u.createdAt, u)}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'none', fontWeight: 700, borderColor: 'rgba(30,58,72,0.25)', color: ACCENT }}
                    onClick={() => navigate('/profile', { state: { userId: u.id } })}
                  >
                    Open profile
                  </Button>
                </Box>
              ))}
              {filteredUsers.length === 0 && (
                <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: '#3A4540' }}>No users match.</Typography>
              )}
            </Box>
            )}
          </Box>
        )}

        {!loading && tab === 'properties' && (
          <Box
            sx={{
              borderRadius: '16px',
              bgcolor: 'rgba(235,230,212,0.82)',
              border: '1px solid rgba(22,48,42,0.16)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                  minWidth: 200,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: '12px',
                  bgcolor: 'rgba(235,230,212,0.78)',
                  border: '1px solid rgba(22,48,42,0.18)',
                }}
              >
                <SearchIcon sx={{ color: '#A89F84', fontSize: 20 }} />
                <InputBase
                  fullWidth
                  placeholder="Search title, city, location…"
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                />
              </Box>
              <Select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(String(e.target.value))}
                sx={{ minWidth: 140, borderRadius: '10px', bgcolor: 'rgba(235, 230, 212,0.8)' }}
              >
                <MenuItem value="all">All status</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                <MenuItem value="SOLD">SOLD</MenuItem>
                <MenuItem value="RENTED">RENTED</MenuItem>
              </Select>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={layoutMode}
                onChange={(_, v) => v && setLayoutMode(v)}
                sx={{
                  bgcolor: 'rgba(235, 230, 212,0.8)',
                  borderRadius: '10px',
                  '& .MuiToggleButton-root': { px: 1.1, border: 'none', color: '#3A4540' },
                  '& .Mui-selected': { bgcolor: 'rgba(30,58,72,0.12) !important', color: `${ACCENT} !important` },
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
                  '& th, & td': {
                    textAlign: 'left',
                    px: 1.5,
                    py: 1.15,
                    fontSize: 13,
                    borderBottom: '1px solid rgba(90,70,50,0.08)',
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  },
                  '& th': { fontWeight: 800, color: '#3A4540', bgcolor: 'rgba(246,242,235,0.7)' },
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
                    <tr key={p.propertyId}>
                      <td>{p.propertyId}</td>
                      <td>
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{p.title}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#3A4540' }}>
                          {p.city || p.location || '—'} · owner #{p.userId}
                        </Typography>
                      </td>
                      <td>{p.propertyType}</td>
                      <td>{fmtMoney(p.price)}</td>
                      <td>
                        <Chip size="small" label={p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE')} sx={{ fontWeight: 700 }} />
                      </td>
                      <td>{p.viewCount ?? 0}</td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                            onClick={() => navigate(`/property/${p.propertyId}`)}
                          >
                            Open
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={deletingProperty}
                            onClick={() => onDeleteProperty(String(p.propertyId))}
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
                <Typography sx={{ p: 3, textAlign: 'center', color: '#3A4540' }}>No properties match.</Typography>
              )}
            </Box>
            ) : (
            <Box
              sx={{
                p: 1.5,
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              }}
            >
              {filteredProperties.map((p: any) => (
                <Box key={p.propertyId} sx={{ ...gridCardHoverSx, p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{p.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#3A4540', fontWeight: 600 }}>
                    {p.city || p.location || '—'} · #{p.propertyId}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                    <Chip size="small" label={p.propertyType || '—'} sx={{ fontWeight: 700 }} />
                    <Chip size="small" label={p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE')} sx={{ fontWeight: 700 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 18, color: ACCENT }}>{fmtMoney(p.price)}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#3A4540' }}>{p.viewCount ?? 0} views · owner #{p.userId}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, mt: 'auto', pt: 0.5 }}>
                    <Button
                      size="small"
                      fullWidth
                      variant="outlined"
                      sx={{ textTransform: 'none', fontWeight: 700, borderColor: 'rgba(30,58,72,0.25)', color: ACCENT }}
                      onClick={() => navigate(`/property/${p.propertyId}`)}
                    >
                      Open
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={deletingProperty}
                      onClick={() => onDeleteProperty(String(p.propertyId))}
                      title="Delete property"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredProperties.length === 0 && (
                <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: '#3A4540' }}>No properties match.</Typography>
              )}
            </Box>
            )}
          </Box>
        )}

        {!loading && tab === 'posts' && (
          <Box
            sx={{
              borderRadius: '16px',
              bgcolor: 'rgba(235,230,212,0.82)',
              border: '1px solid rgba(22,48,42,0.16)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={layoutMode}
                onChange={(_, v) => v && setLayoutMode(v)}
                sx={{
                  bgcolor: 'rgba(235, 230, 212,0.8)',
                  borderRadius: '10px',
                  '& .MuiToggleButton-root': { px: 1.1, border: 'none', color: '#3A4540' },
                  '& .Mui-selected': { bgcolor: 'rgba(30,58,72,0.12) !important', color: `${ACCENT} !important` },
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
                  '& th, & td': {
                    textAlign: 'left',
                    px: 1.5,
                    py: 1.15,
                    fontSize: 13,
                    borderBottom: '1px solid rgba(90,70,50,0.08)',
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    verticalAlign: 'top',
                  },
                  '& th': { fontWeight: 800, color: '#3A4540', bgcolor: 'rgba(246,242,235,0.7)' },
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
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{p.title || 'Untitled'}</Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: '#3A4540',
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
                        <Typography sx={{ fontSize: 11, color: '#A89F84' }}>#{p.userId}</Typography>
                      </td>
                      <td>
                        {p.likeCount || 0} likes · {p.commentCount || 0} comments
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
                <Typography sx={{ p: 3, textAlign: 'center', color: '#3A4540' }}>No posts found.</Typography>
              )}
            </Box>
            ) : (
            <Box
              sx={{
                p: 1.5,
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              }}
            >
              {posts.map((p: any) => (
                <Box key={p.id} sx={{ ...gridCardHoverSx, p: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{p.title || 'Untitled'}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#A89F84' }}>#{p.id}</Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#3A4540',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: 48,
                    }}
                  >
                    {p.content}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                    {p.userFirstName} {p.userLastName}{' '}
                    <Box component="span" sx={{ color: '#A89F84', fontWeight: 600 }}>#{p.userId}</Box>
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#3A4540' }}>
                    {p.likeCount || 0} likes · {p.commentCount || 0} comments
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                    <Typography sx={{ fontSize: 11, color: '#3A4540' }}>{fmtDate(p.createdAt)}</Typography>
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
                <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: '#3A4540' }}>No posts found.</Typography>
              )}
            </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AdminDashboard;
