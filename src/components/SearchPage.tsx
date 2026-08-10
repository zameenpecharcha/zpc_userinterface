import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { SEARCH_USERS_LIGHT } from '../graphql/user';
import { SEARCH_POSTS } from '../graphql/posts';
import { PUBLIC_PROPERTIES } from '../graphql/property';
import { MATTE_PANEL, MATTE_SURFACE, PAGE_ATMOSPHERE } from '../theme/surfaces';
import AdminBackground from './admin/AdminBackground';
import { ZpcLogoMark } from './brand/ZpcLogo';
import { nameInitials, stringToColor } from '../utils/mentions';
import { parseSearchQuery } from '../utils/searchQuery';

const interFont = { fontFamily: "'DM Sans', 'Source Sans 3', system-ui, sans-serif" };
const displayFont = { fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" };

type SearchTab = 'all' | 'people' | 'properties' | 'posts';

const ROLE_OPTIONS = [
  { value: '', label: 'Any role' },
  { value: 'builder', label: 'Builder' },
  { value: 'agent', label: 'Agent' },
  { value: 'general_user', label: 'General user' },
  { value: 'admin', label: 'Admin' },
];

const PROPERTY_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'plot', label: 'Plot' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'pg', label: 'PG / Hostel' },
];

const LISTING_TYPES = [
  { value: '', label: 'Any listing' },
  { value: 'sale', label: 'Sale' },
  { value: 'rent', label: 'Rent' },
];

const POST_PROPERTY_TYPES = [
  { value: '', label: 'Any property type' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'plot', label: 'Plot' },
  { value: 'commercial', label: 'Commercial' },
];

const CARD_RADIUS = 2;

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width:900px)');

  const qParam = params.get('q') || '';
  const tabParam = (params.get('tab') as SearchTab) || 'all';

  const [draft, setDraft] = useState(qParam);
  const [showAllFilters, setShowAllFilters] = useState(false);

  // People filters
  const [peopleRole, setPeopleRole] = useState(params.get('role') || '');
  const [peopleLocation, setPeopleLocation] = useState(params.get('peopleLocation') || '');

  // Property filters
  const [propCity, setPropCity] = useState(params.get('city') || '');
  const [propType, setPropType] = useState(params.get('propertyType') || '');
  const [listingType, setListingType] = useState(params.get('listingType') || '');

  // Post filters
  const [postLocation, setPostLocation] = useState(params.get('postLocation') || '');
  const [postPropType, setPostPropType] = useState(params.get('postPropertyType') || '');

  const parsed = useMemo(() => parseSearchQuery(qParam), [qParam]);
  const hasQuery = Boolean(parsed.apiQuery || peopleRole || propCity || propType || listingType || postLocation || postPropType);

  const [runPeople, peopleState] = useLazyQuery(SEARCH_USERS_LIGHT, { fetchPolicy: 'network-only', errorPolicy: 'all' });
  const [runPosts, postsState] = useLazyQuery(SEARCH_POSTS, { fetchPolicy: 'network-only', errorPolicy: 'all' });
  const [runProps, propsState] = useLazyQuery(PUBLIC_PROPERTIES, { fetchPolicy: 'network-only', errorPolicy: 'all' });

  const runSearch = useCallback(
    (override?: { q?: string; tab?: SearchTab }) => {
      const q = override?.q ?? qParam;
      const tab = override?.tab ?? tabParam;
      const parsedQ = parseSearchQuery(q);
      const apiQ = parsedQ.apiQuery;

      const needPeople = tab === 'all' || tab === 'people';
      const needPosts = tab === 'all' || tab === 'posts';
      const needProps = tab === 'all' || tab === 'properties';

      if (needPeople && (apiQ || peopleRole || peopleLocation)) {
        runPeople({
          variables: {
            // Backend does substring ILIKE matching; don't gate on role here
            search: apiQ || peopleLocation || '',
            page: 1,
            limit: tab === 'all' ? 8 : 40,
          },
        });
      }
      if (needPosts && (apiQ || postLocation || postPropType)) {
        runPosts({
          variables: {
            query: apiQ || null,
            location: postLocation || null,
            propertyType: postPropType || null,
            page: 1,
            limit: tab === 'all' ? 8 : 30,
          },
        });
      }
      if (needProps && (apiQ || propCity || propType || listingType)) {
        const cityGuess = propCity || apiQ.split(/\s+/)[0] || undefined;
        runProps({
          variables: {
            page: 1,
            limit: tab === 'all' ? 8 : 30,
            city: cityGuess || null,
            propertyType: propType || null,
            listingType: listingType || null,
          },
        });
      }
    },
    [
      qParam,
      tabParam,
      peopleRole,
      peopleLocation,
      postLocation,
      postPropType,
      propCity,
      propType,
      listingType,
      runPeople,
      runPosts,
      runProps,
    ]
  );

  useEffect(() => {
    setDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    if (!hasQuery) return;
    runSearch();
  }, [
    qParam,
    tabParam,
    peopleRole,
    peopleLocation,
    propCity,
    propType,
    listingType,
    postLocation,
    postPropType,
    hasQuery,
    runSearch,
  ]);

  const commitSearch = (nextQ?: string, nextTab?: SearchTab) => {
    const q = (nextQ ?? draft).trim();
    const next = new URLSearchParams(params);
    if (q) next.set('q', q);
    else next.delete('q');
    if (nextTab) next.set('tab', nextTab);
    else if (!next.get('tab')) next.set('tab', tabParam || 'all');

    if (peopleRole) next.set('role', peopleRole);
    else next.delete('role');
    if (peopleLocation) next.set('peopleLocation', peopleLocation);
    else next.delete('peopleLocation');
    if (propCity) next.set('city', propCity);
    else next.delete('city');
    if (propType) next.set('propertyType', propType);
    else next.delete('propertyType');
    if (listingType) next.set('listingType', listingType);
    else next.delete('listingType');
    if (postLocation) next.set('postLocation', postLocation);
    else next.delete('postLocation');
    if (postPropType) next.set('postPropertyType', postPropType);
    else next.delete('postPropertyType');

    setParams(next, { replace: false });
  };

  const setTab = (tab: SearchTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next);
  };

  const peopleRaw = peopleState.data?.users || [];
  const people = useMemo(() => {
    const q = (parsed.apiQuery || '').trim().toLowerCase();
    return peopleRaw.filter((u: any) => {
      if (peopleRole && String(u.role || '').toLowerCase() !== peopleRole.toLowerCase()) {
        return false;
      }
      if (peopleLocation && !String(u.address || '').toLowerCase().includes(peopleLocation.toLowerCase())) {
        return false;
      }
      // Trust backend substring search for the keyword; only apply optional filters above.
      if (!q) return true;
      const blob = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''} ${u.role || ''} ${u.bio || ''}`.toLowerCase();
      return blob.includes(q) || q.split(/\s+/).filter((t) => t.length >= 2).every((t) => blob.includes(t));
    });
  }, [peopleRaw, peopleLocation, peopleRole, parsed.apiQuery]);

  const postsRaw = postsState.data?.searchPosts || [];
  const posts = useMemo(() => {
    const q = (parsed.apiQuery || '').trim().toLowerCase();
    if (!q) return postsRaw;
    return postsRaw.filter((p: any) => {
      const blob = `${p.title || ''} ${p.content || ''} ${p.location || ''} ${p.propertyType || ''} ${p.userFirstName || ''} ${p.userLastName || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [postsRaw, parsed.apiQuery]);

  const properties = propsState.data?.publicProperties?.properties || [];

  const loading =
    (tabParam === 'all' || tabParam === 'people') && peopleState.loading ||
    (tabParam === 'all' || tabParam === 'posts') && postsState.loading ||
    (tabParam === 'all' || tabParam === 'properties') && propsState.loading;

  const activeFilterChips: { key: string; label: string; clear: () => void }[] = [];
  if (peopleRole && (tabParam === 'all' || tabParam === 'people')) {
    activeFilterChips.push({
      key: 'role',
      label: `Role: ${peopleRole}`,
      clear: () => setPeopleRole(''),
    });
  }
  if (peopleLocation && (tabParam === 'all' || tabParam === 'people')) {
    activeFilterChips.push({
      key: 'ploc',
      label: `People in: ${peopleLocation}`,
      clear: () => setPeopleLocation(''),
    });
  }
  if (propCity && (tabParam === 'all' || tabParam === 'properties')) {
    activeFilterChips.push({
      key: 'city',
      label: `City: ${propCity}`,
      clear: () => setPropCity(''),
    });
  }
  if (propType && (tabParam === 'all' || tabParam === 'properties')) {
    activeFilterChips.push({
      key: 'ptype',
      label: `Type: ${propType}`,
      clear: () => setPropType(''),
    });
  }
  if (listingType && (tabParam === 'all' || tabParam === 'properties')) {
    activeFilterChips.push({
      key: 'listing',
      label: `Listing: ${listingType}`,
      clear: () => setListingType(''),
    });
  }
  if (postLocation && (tabParam === 'all' || tabParam === 'posts')) {
    activeFilterChips.push({
      key: 'postloc',
      label: `Post location: ${postLocation}`,
      clear: () => setPostLocation(''),
    });
  }
  if (postPropType && (tabParam === 'all' || tabParam === 'posts')) {
    activeFilterChips.push({
      key: 'posttype',
      label: `Post type: ${postPropType}`,
      clear: () => setPostPropType(''),
    });
  }

  const openProfile = (id: string) => navigate('/home', { state: { openProfileId: id } });

  const FilterSelect = ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        minWidth: 140,
        '& .MuiOutlinedInput-root': {
          bgcolor: 'rgba(255,255,255,0.45)',
          borderRadius: 1.5,
          ...interFont,
        },
      }}
    >
      {options.map((o) => (
        <MenuItem key={o.value || 'any'} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );

  const renderPeople = (limit?: number) => {
    const list = typeof limit === 'number' ? people.slice(0, limit) : people;
    if (peopleState.loading && !peopleRaw.length) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} sx={{ color: '#16302A' }} />
        </Box>
      );
    }
    if (!list.length) {
      return (
        <Typography sx={{ color: '#5C675F', fontSize: 14, py: 2 }}>
          No people matched. Try another keyword, role, or location.
        </Typography>
      );
    }
    return (
      <Stack spacing={1}>
        {list.map((u: any) => {
          const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Member';
          const photo = u.profilePhotoSignedUrl || u.profilePhoto;
          return (
            <Box
              key={u.id}
              onClick={() => openProfile(String(u.id))}
              sx={{
                ...MATTE_SURFACE,
                borderRadius: CARD_RADIUS,
                p: 1.5,
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.55)' },
              }}
            >
              <Avatar
                src={photo || undefined}
                sx={{ width: 52, height: 52, bgcolor: stringToColor(name), fontWeight: 700 }}
              >
                {nameInitials(name)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 15, ...displayFont }}>
                  {name}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>
                  {[u.role, u.address].filter(Boolean).join(' · ') || u.email}
                </Typography>
                {u.bio && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#3A4540',
                      mt: 0.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.bio}
                  </Typography>
                )}
              </Box>
              <Chip
                size="small"
                label={u.role || 'member'}
                sx={{ textTransform: 'capitalize', bgcolor: 'rgba(22,48,42,0.08)', fontWeight: 600 }}
              />
            </Box>
          );
        })}
      </Stack>
    );
  };

  const renderProperties = (limit?: number) => {
    const list = typeof limit === 'number' ? properties.slice(0, limit) : properties;
    if (propsState.loading && !properties.length) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} sx={{ color: '#16302A' }} />
        </Box>
      );
    }
    if (!list.length) {
      return (
        <Typography sx={{ color: '#5C675F', fontSize: 14, py: 2 }}>
          No properties found. Filter by city (e.g. Hyderabad) and type.
        </Typography>
      );
    }
    return (
      <Stack spacing={1}>
        {list.map((p: any) => (
          <Box
            key={p.id}
            onClick={() => navigate(`/property/${p.id}`)}
            sx={{
              ...MATTE_SURFACE,
              borderRadius: CARD_RADIUS,
              p: 1.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.55)' },
            }}
          >
            <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 15, ...displayFont }}>
              {p.title || p.projectName || 'Property'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#5C675F', mt: 0.35 }}>
              {[p.propertyType, p.listingType, p.city, p.state].filter(Boolean).join(' · ')}
            </Typography>
            {p.price != null && (
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#16302A', mt: 0.5 }}>
                {p.currency || '₹'}
                {Number(p.price).toLocaleString('en-IN')}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    );
  };

  const renderPosts = (limit?: number) => {
    const list = typeof limit === 'number' ? posts.slice(0, limit) : posts;
    if (postsState.loading && !postsRaw.length) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} sx={{ color: '#16302A' }} />
        </Box>
      );
    }
    if (!list.length) {
      return (
        <Typography sx={{ color: '#5C675F', fontSize: 14, py: 2 }}>
          No posts matched. Try keywords, location, or property type.
        </Typography>
      );
    }
    return (
      <Stack spacing={1}>
        {list.map((p: any) => (
          <Box
            key={p.id}
            onClick={() => navigate('/home', { state: { focusPostId: p.id } })}
            sx={{
              ...MATTE_SURFACE,
              borderRadius: CARD_RADIUS,
              p: 1.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.55)' },
            }}
          >
            <Typography sx={{ fontSize: 12, color: '#5C675F', mb: 0.35 }}>
              {[p.userFirstName, p.userLastName].filter(Boolean).join(' ')}
              {p.location ? ` · ${p.location}` : ''}
            </Typography>
            <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 15, ...displayFont }}>
              {p.title || (p.content || '').slice(0, 80) || 'Post'}
            </Typography>
            {p.content && (
              <Typography
                sx={{
                  fontSize: 13,
                  color: '#3A4540',
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.content}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    );
  };

  const sectionHeader = (icon: React.ReactNode, title: string, count: number, onSeeAll?: () => void) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#16302A' }}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: 16, ...displayFont }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: '#5C675F' }}>({count})</Typography>
      </Box>
      {onSeeAll && (
        <Button onClick={onSeeAll} sx={{ textTransform: 'none', fontWeight: 700, color: '#16302A' }}>
          See all
        </Button>
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', ...PAGE_ATMOSPHERE }}>
      <AdminBackground />
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          ...MATTE_SURFACE,
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          color: '#16302A',
        }}
      >
        <Toolbar sx={{ gap: 1, maxWidth: 920, width: '100%', mx: 'auto', px: { xs: 1, sm: 2 } }}>
          <IconButton onClick={() => navigate('/home')} sx={{ color: '#16302A' }} aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
          {!isMobile && <ZpcLogoMark size={40} showTagline={false} animateStroke={false} />}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(22,48,42,0.06)',
              px: 1.5,
              py: 0.65,
              borderRadius: 999,
              border: '1px solid rgba(22,48,42,0.12)',
            }}
          >
            <SearchIcon sx={{ color: '#5C675F', fontSize: 20 }} />
            <InputBase
              fullWidth
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSearch();
              }}
              placeholder='Search people, properties, posts — try "Hyderabad" OR builder'
              sx={{ fontSize: 14.5, color: '#16302A', ...interFont }}
            />
            {draft && (
              <IconButton
                size="small"
                onClick={() => {
                  setDraft('');
                  commitSearch('');
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Button
            variant="contained"
            onClick={() => commitSearch()}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#16302A',
              color: '#fff',
              borderRadius: 999,
              px: 2,
              '&:hover': { bgcolor: '#0A1C18' },
            }}
          >
            Search
          </Button>
        </Toolbar>

        <Box sx={{ maxWidth: 920, width: '100%', mx: 'auto', px: { xs: 1, sm: 2 } }}>
          <Tabs
            value={tabParam}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                minHeight: 44,
                color: '#5C675F',
                ...interFont,
              },
              '& .Mui-selected': { color: '#16302A !important' },
              '& .MuiTabs-indicator': { bgcolor: '#16302A', height: 2 },
            }}
          >
            <Tab value="all" label="All" />
            <Tab value="people" label="People" />
            <Tab value="properties" label="Properties" />
            <Tab value="posts" label="Posts" />
          </Tabs>
        </Box>
      </AppBar>

      {/* Filter bar — LinkedIn style above results */}
      <Box
        sx={{
          position: 'sticky',
          top: isMobile ? 112 : 108,
          zIndex: 10,
          borderBottom: '1px solid rgba(22,48,42,0.1)',
          bgcolor: 'rgba(235,230,212,0.82)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box
          sx={{
            maxWidth: 920,
            mx: 'auto',
            px: { xs: 1.25, sm: 2 },
            py: 1.25,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
          }}
        >
          {(tabParam === 'all' || tabParam === 'people') && (
            <>
              <FilterSelect label="People type" value={peopleRole} onChange={setPeopleRole} options={ROLE_OPTIONS} />
              <TextField
                size="small"
                label="People location"
                value={peopleLocation}
                onChange={(e) => setPeopleLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.45)', borderRadius: 1.5 } }}
              />
            </>
          )}
          {(tabParam === 'all' || tabParam === 'properties') && (
            <>
              <TextField
                size="small"
                label="City"
                value={propCity}
                onChange={(e) => setPropCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.45)', borderRadius: 1.5 } }}
              />
              <FilterSelect label="Property type" value={propType} onChange={setPropType} options={PROPERTY_TYPES} />
              {(showAllFilters || tabParam === 'properties') && (
                <FilterSelect label="Listing" value={listingType} onChange={setListingType} options={LISTING_TYPES} />
              )}
            </>
          )}
          {(tabParam === 'all' || tabParam === 'posts') && (
            <>
              <TextField
                size="small"
                label="Post location"
                value={postLocation}
                onChange={(e) => setPostLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
                sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.45)', borderRadius: 1.5 } }}
              />
              {(showAllFilters || tabParam === 'posts') && (
                <FilterSelect
                  label="In posts"
                  value={postPropType}
                  onChange={setPostPropType}
                  options={POST_PROPERTY_TYPES}
                />
              )}
            </>
          )}

          <Button
            startIcon={<FilterListIcon />}
            onClick={() => setShowAllFilters((v) => !v)}
            sx={{ textTransform: 'none', fontWeight: 700, color: '#16302A', ml: { sm: 'auto' } }}
          >
            {showAllFilters ? 'Fewer filters' : 'All filters'}
          </Button>
          <Button
            onClick={() => commitSearch()}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(22,48,42,0.1)',
              color: '#16302A',
              borderRadius: 999,
              px: 1.75,
            }}
          >
            Apply
          </Button>
        </Box>

        {activeFilterChips.length > 0 && (
          <Box sx={{ maxWidth: 920, mx: 'auto', px: { xs: 1.25, sm: 2 }, pb: 1.25, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {activeFilterChips.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                onDelete={c.clear}
                size="small"
                sx={{ bgcolor: 'rgba(22,48,42,0.1)', fontWeight: 600 }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 920, mx: 'auto', px: { xs: 1.25, sm: 2 }, py: 2.5 }}>
        {!hasQuery ? (
          <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: '#16302A', mb: 1, ...displayFont }}>
              Search ZPC
            </Typography>
            <Typography sx={{ color: '#3A4540', fontSize: 14, mb: 2, lineHeight: 1.55 }}>
              Find people (builders, agents), properties by city/type, and posts. Supports Boolean tips in the bar:
            </Typography>
            <Stack spacing={0.75} sx={{ color: '#5C675F', fontSize: 13.5 }}>
              <div>
                Exact phrase: <code>&quot;Vice President&quot;</code>
              </div>
              <div>
                Either term: <code>builder OR agent</code>
              </div>
              <div>
                Exclude: <code>apartment -rent</code>
              </div>
            </Stack>
          </Box>
        ) : (
          <>
            <Typography sx={{ mb: 2, color: '#5C675F', fontSize: 13.5 }}>
              Results for <strong style={{ color: '#16302A' }}>{qParam || 'filters'}</strong>
              {loading ? ' · searching…' : ''}
            </Typography>
            {(peopleState.error || postsState.error || propsState.error) && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
                Search request failed
                {peopleState.error ? `: ${peopleState.error.message}` : ''}
                . Check that the API gateway is running and you are logged in.
              </Alert>
            )}

            {tabParam === 'all' && (
              <Stack spacing={2.5}>
                <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>
                  {sectionHeader(<PeopleIcon fontSize="small" />, 'People', people.length, () => setTab('people'))}
                  {renderPeople(5)}
                </Box>
                <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>
                  {sectionHeader(
                    <HomeWorkOutlinedIcon fontSize="small" />,
                    'Properties',
                    properties.length,
                    () => setTab('properties')
                  )}
                  {renderProperties(5)}
                </Box>
                <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>
                  {sectionHeader(<ArticleOutlinedIcon fontSize="small" />, 'Posts', posts.length, () => setTab('posts'))}
                  {renderPosts(5)}
                </Box>
              </Stack>
            )}

            {tabParam === 'people' && (
              <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>{renderPeople()}</Box>
            )}
            {tabParam === 'properties' && (
              <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>{renderProperties()}</Box>
            )}
            {tabParam === 'posts' && (
              <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>{renderPosts()}</Box>
            )}
          </>
        )}

        <Divider sx={{ my: 3, borderColor: 'rgba(22,48,42,0.08)' }} />
        <Typography sx={{ fontSize: 12, color: 'rgba(22,48,42,0.5)', textAlign: 'center' }}>
          ZPC search · People · Properties · Posts
        </Typography>
      </Box>
    </Box>
  );
};

export default SearchPage;
