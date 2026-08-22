import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
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
import { GLOBAL_SEARCH } from '../graphql/search';
import { PUBLIC_PROPERTIES } from '../graphql/property';
import TabEnter from './motion/TabEnter';
import { MATTE_PANEL, MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';
import ScrollablePageShell from './layout/ScrollablePageShell';
import { ZpcNavLogo } from './brand/ZpcNavLogo';
import HeaderLogoutButton from './HeaderLogoutButton';
import { nameInitials, stringToColor, collapseMentionTokens } from '../utils/mentions';
import { parseSearchQuery } from '../utils/searchQuery';
import { stripCategoryPrefix, categoryFromTitle } from '../constants/postCategories';

const interFont = { fontFamily: "'DM Sans', 'Source Sans 3', system-ui, sans-serif" };
const displayFont = { fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif" };

type SearchTab = 'all' | 'people' | 'properties' | 'posts';
type SearchEntityType = 'USER' | 'POST' | 'PROPERTY' | 'COMMENT';

type SearchHit = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  bio?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  location?: string | null;
};

const ROLE_OPTIONS = [
  { value: '', label: 'Any role' },
  { value: 'USER', label: 'User' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'BUILDER', label: 'Builder' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'LAWYER', label: 'Lawyer' },
  { value: 'INVESTOR', label: 'Investor' },
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
/** Same page size as Home / Profile post feed. */
const PROPERTY_PAGE_SIZE = 12;

const TAB_ENTITY_TYPES: Record<SearchTab, SearchEntityType[] | null> = {
  all: ['USER', 'POST', 'PROPERTY'],
  people: ['USER'],
  properties: ['PROPERTY'],
  posts: ['POST'],
};

function buildKeyword(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width:900px)');

  const qParam = params.get('q') || '';
  const tabParam = (params.get('tab') as SearchTab) || 'all';

  const [draft, setDraft] = useState(qParam);
  const [showAllFilters, setShowAllFilters] = useState(false);

  const [peopleRole, setPeopleRole] = useState(params.get('role') || '');
  const [peopleLocation, setPeopleLocation] = useState(params.get('peopleLocation') || '');

  const [propCity, setPropCity] = useState(params.get('city') || '');
  const [propType, setPropType] = useState(params.get('propertyType') || '');
  const [listingType, setListingType] = useState(params.get('listingType') || '');

  const [postLocation, setPostLocation] = useState(params.get('postLocation') || '');
  const [postPropType, setPostPropType] = useState(params.get('postPropertyType') || '');

  const parsed = useMemo(() => parseSearchQuery(qParam), [qParam]);
  const hasQuery = Boolean(
    parsed.apiQuery || peopleRole || propCity || propType || listingType || postLocation || postPropType || peopleLocation
  );

  const [runGlobalSearch, searchState] = useLazyQuery(GLOBAL_SEARCH, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const propertySearchKeyword = useMemo(
    () => buildKeyword([parsed.apiQuery, propCity]),
    [parsed.apiQuery, propCity]
  );

  const {
    data: publicPropsData,
    loading: publicPropsLoading,
    networkStatus: publicPropsNetworkStatus,
    fetchMore: fetchMorePublicProperties,
    error: publicPropsError,
  } = useQuery(PUBLIC_PROPERTIES, {
    variables: {
      page: 1,
      limit: PROPERTY_PAGE_SIZE,
      search: propertySearchKeyword || undefined,
      propertyType: propType || undefined,
      listingType: listingType || undefined,
    },
    skip: tabParam !== 'properties',
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const [loadingMoreProperties, setLoadingMoreProperties] = useState(false);

  const openUser = useCallback(
    (userId: string) => {
      const id = String(userId || '').trim();
      if (!id) return;
      navigate(`/profile/${id}`);
    },
    [navigate]
  );

  const openProperty = useCallback(
    (propertyId: string) => {
      const id = String(propertyId || '').trim();
      if (!id) return;
      navigate(`/property/${id}`);
    },
    [navigate]
  );

  const openPost = useCallback(
    (postId: string) => {
      const id = String(postId || '').trim();
      if (!id) return;
      navigate(`/home?post=${encodeURIComponent(id)}`);
    },
    [navigate]
  );

  const runSearch = useCallback(
    (override?: { q?: string; tab?: SearchTab }) => {
      const q = override?.q ?? qParam;
      const tab = override?.tab ?? tabParam;
      const parsedQ = parseSearchQuery(q);
      const keyword = buildKeyword([
        parsedQ.apiQuery,
        peopleLocation,
        propCity,
        propType,
        listingType,
        postLocation,
        postPropType,
        peopleRole,
      ]);
      if (!keyword) return;

      const size = tab === 'all' ? 40 : 50;
      runGlobalSearch({
        variables: {
          request: {
            keyword,
            entityTypes: TAB_ENTITY_TYPES[tab],
            pagination: { page: 0, size },
            sortBy: 'RELEVANCE',
          },
        },
      });
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
      runGlobalSearch,
    ]
  );

  useEffect(() => {
    setDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    // Properties tab browses Postgres via publicProperties (no OpenSearch required).
    if (tabParam === 'properties') return;
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
    // Keep each tab focused: drop filters that belong to other entity types.
    if (tab === 'properties') {
      setPeopleRole('');
      setPeopleLocation('');
      setPostLocation('');
      setPostPropType('');
      next.delete('role');
      next.delete('peopleLocation');
      next.delete('postLocation');
      next.delete('postPropertyType');
      setShowAllFilters(false);
    } else if (tab === 'people') {
      setPropCity('');
      setPropType('');
      setListingType('');
      setPostLocation('');
      setPostPropType('');
      next.delete('city');
      next.delete('propertyType');
      next.delete('listingType');
      next.delete('postLocation');
      next.delete('postPropertyType');
      setShowAllFilters(false);
    } else if (tab === 'posts') {
      setPeopleRole('');
      setPeopleLocation('');
      setPropCity('');
      setPropType('');
      setListingType('');
      next.delete('role');
      next.delete('peopleLocation');
      next.delete('city');
      next.delete('propertyType');
      next.delete('listingType');
      setShowAllFilters(false);
    }
    setParams(next);
  };

  const searchPlaceholder =
    tabParam === 'properties'
      ? 'Search properties by city, project, or builder'
      : tabParam === 'people'
        ? 'Search people by name, role, or location'
        : tabParam === 'posts'
          ? 'Search posts by keyword or location'
          : 'Search people, properties, posts — try "Hyderabad" OR builder';

  const propertyTabQuery = Boolean(parsed.apiQuery || propCity || propType || listingType);

  const results: SearchHit[] = useMemo(
    () => searchState.data?.globalSearch?.results || [],
    [searchState.data?.globalSearch?.results]
  );

  const people = useMemo(() => {
    return results.filter((r) => {
      if (r.entityType !== 'USER') return false;
      if (peopleRole && String(r.bio || '').toUpperCase() !== peopleRole.toUpperCase()) return false;
      if (peopleLocation && !String(r.location || '').toLowerCase().includes(peopleLocation.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [results, peopleRole, peopleLocation]);

  const searchProperties = useMemo(() => {
    return results.filter((r) => {
      if (r.entityType !== 'PROPERTY') return false;
      if (propCity && !String(r.location || '').toLowerCase().includes(propCity.toLowerCase())) return false;
      const blob = `${r.title || ''} ${r.description || ''} ${r.location || ''}`.toLowerCase();
      if (propType && !blob.includes(propType.toLowerCase())) return false;
      if (listingType && !blob.includes(listingType.toLowerCase())) return false;
      return true;
    });
  }, [results, propCity, propType, listingType]);

  const browsedProperties: SearchHit[] = useMemo(() => {
    const rows = publicPropsData?.publicProperties?.properties || [];
    return rows.map((p: any) => ({
      id: String(p.id),
      entityType: 'PROPERTY' as const,
      title: p.title || 'Property',
      bio: [p.propertyType, p.listingType].filter(Boolean).join(' · ') || null,
      description: p.description || null,
      imageUrl: null,
      location: [p.city, p.state].filter(Boolean).join(', ') || p.location || null,
    }));
  }, [publicPropsData]);

  const properties = tabParam === 'properties' ? browsedProperties : searchProperties;
  const propertyTotal = publicPropsData?.publicProperties?.total ?? properties.length;
  const propertyHasMore =
    tabParam === 'properties' && browsedProperties.length < (publicPropsData?.publicProperties?.total || 0);

  const loadMoreProperties = useCallback(async () => {
    if (loadingMoreProperties || !propertyHasMore) return;
    const nextPage = Math.floor(browsedProperties.length / PROPERTY_PAGE_SIZE) + 1;
    setLoadingMoreProperties(true);
    try {
      await fetchMorePublicProperties({
        variables: {
          page: nextPage,
          limit: PROPERTY_PAGE_SIZE,
          search: propertySearchKeyword || undefined,
          propertyType: propType || undefined,
          listingType: listingType || undefined,
        },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult?.publicProperties) return prev;
          const existing = prev?.publicProperties?.properties || [];
          const seen = new Set(existing.map((x: any) => String(x.id)));
          const appended = (fetchMoreResult.publicProperties.properties || []).filter(
            (x: any) => !seen.has(String(x.id))
          );
          return {
            ...prev,
            publicProperties: {
              ...fetchMoreResult.publicProperties,
              properties: [...existing, ...appended],
            },
          };
        },
      });
    } finally {
      setLoadingMoreProperties(false);
    }
  }, [
    loadingMoreProperties,
    propertyHasMore,
    browsedProperties.length,
    fetchMorePublicProperties,
    propertySearchKeyword,
    propType,
    listingType,
  ]);

  const posts = useMemo(() => {
    return results.filter((r) => {
      if (r.entityType !== 'POST') return false;
      if (postLocation && !String(r.location || '').toLowerCase().includes(postLocation.toLowerCase())) {
        return false;
      }
      if (postPropType) {
        const blob = `${r.title || ''} ${r.description || ''} ${r.location || ''}`.toLowerCase();
        if (!blob.includes(postPropType.toLowerCase())) return false;
      }
      return true;
    });
  }, [results, postLocation, postPropType]);

  const loading = tabParam === 'properties' ? publicPropsLoading && !browsedProperties.length : searchState.loading;
  const totalHits =
    tabParam === 'properties'
      ? propertyTotal
      : searchState.data?.globalSearch?.totalHits ?? 0;

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
    if (loading && !results.length) {
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
        {list.map((u) => {
          const name = u.title || 'Member';
          const photo = u.imageUrl || undefined;
          return (
            <Box
              key={u.id}
              onClick={() => openUser(String(u.id))}
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
                  {[u.bio, u.location].filter(Boolean).join(' · ') || 'Member'}
                </Typography>
                {u.description && (
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
                    {u.description}
                  </Typography>
                )}
              </Box>
              <Chip
                size="small"
                label={u.bio || 'member'}
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
    const propsLoading =
      tabParam === 'properties'
        ? publicPropsLoading && !browsedProperties.length
        : loading && !results.length;
    if (propsLoading) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} sx={{ color: '#16302A' }} />
        </Box>
      );
    }
    if (tabParam === 'properties' && publicPropsError) {
      return (
        <Alert severity="error" sx={{ borderRadius: 1.5 }}>
          Could not load properties: {publicPropsError.message}
        </Alert>
      );
    }
    if (!list.length) {
      return (
        <Typography sx={{ color: '#5C675F', fontSize: 14, py: 2 }}>
          No properties found. Try another city, type, or listing filter.
        </Typography>
      );
    }
    return (
      <Stack spacing={1}>
        {list.map((p) => (
          <Box
            key={p.id}
            onClick={() => openProperty(String(p.id))}
            sx={{
              ...MATTE_SURFACE,
              borderRadius: CARD_RADIUS,
              p: 1.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.55)' },
            }}
          >
            <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 15, ...displayFont }}>
              {p.title || 'Property'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#5C675F', mt: 0.35 }}>
              {[p.location, p.bio].filter(Boolean).join(' · ') || 'Location not set'}
            </Typography>
            {p.description && (
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
                {p.description}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    );
  };

  const renderPosts = (limit?: number) => {
    const list = typeof limit === 'number' ? posts.slice(0, limit) : posts;
    if (loading && !results.length) {
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
        {list.map((p) => (
          <Box
            key={p.id}
            onClick={() => openPost(String(p.id))}
            sx={{
              ...MATTE_SURFACE,
              borderRadius: CARD_RADIUS,
              p: 1.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.55)' },
            }}
          >
            <Typography sx={{ fontSize: 12, color: '#5C675F', mb: 0.35 }}>
              {categoryFromTitle(p.title) ? `${categoryFromTitle(p.title)} · ` : ''}
              {p.location || 'Post'}
            </Typography>
            <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 15, ...displayFont }}>
              {stripCategoryPrefix(p.title || '') ||
                collapseMentionTokens(p.description || '').slice(0, 80) ||
                'Post'}
            </Typography>
            {p.description && (
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
                {collapseMentionTokens(p.description)}
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
    <ScrollablePageShell
      sx={{ ...interFont }}
      header={(
      <AppBar
        position="static"
        elevation={0}
        sx={{
          ...MATTE_HEADER,
          borderRadius: 0,
        }}
      >
        <Toolbar sx={{ gap: 1, maxWidth: 920, width: '100%', mx: 'auto', px: { xs: 1, sm: 2 }, bgcolor: 'transparent' }}>
          <ZpcNavLogo size={isMobile ? 34 : 40} animateStroke={false} />
          <IconButton onClick={() => navigate('/home')} sx={{ color: '#EBE6D4' }} aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(235,230,212,0.12)',
              px: 1.5,
              py: 0.65,
              borderRadius: 999,
              border: '1px solid rgba(235,230,212,0.28)',
            }}
          >
            <SearchIcon sx={{ color: 'rgba(235,230,212,0.75)', fontSize: 20 }} />
            <InputBase
              fullWidth
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSearch();
              }}
              placeholder={searchPlaceholder}
              sx={{
                fontSize: 14.5,
                color: '#EBE6D4',
                ...interFont,
                '& input::placeholder': { color: 'rgba(235,230,212,0.55)', opacity: 1 },
              }}
            />
            {draft && (
              <IconButton
                size="small"
                onClick={() => {
                  setDraft('');
                  commitSearch('');
                }}
                sx={{ color: '#EBE6D4' }}
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
              bgcolor: 'rgba(235,230,212,0.92)',
              color: '#16302A',
              borderRadius: 999,
              px: 2,
              '&:hover': { bgcolor: '#EBE6D4' },
            }}
          >
            Search
          </Button>
          <HeaderLogoutButton ink="light" size={isMobile ? 'small' : 'medium'} />
        </Toolbar>

        <Box sx={{ maxWidth: 920, width: '100%', mx: 'auto', px: { xs: 1, sm: 2 } }}>
          <Tabs
            value={tabParam}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              bgcolor: 'transparent',
              border: 'none',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                minHeight: 44,
                color: 'rgba(235,230,212,0.7)',
                ...interFont,
              },
              '& .Mui-selected': { color: '#EBE6D4 !important' },
              '& .MuiTabs-indicator': { bgcolor: '#EBE6D4', height: 2 },
            }}
          >
            <Tab value="all" label="All" />
            <Tab value="people" label="People" />
            <Tab value="properties" label="Properties" />
            <Tab value="posts" label="Posts" />
          </Tabs>
        </Box>
      </AppBar>
      )}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
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

          {tabParam === 'all' && (
            <Button
              startIcon={<FilterListIcon />}
              onClick={() => setShowAllFilters((v) => !v)}
              sx={{ textTransform: 'none', fontWeight: 700, color: '#16302A', ml: { sm: 'auto' } }}
            >
              {showAllFilters ? 'Fewer filters' : 'All filters'}
            </Button>
          )}
          <Button
            onClick={() => commitSearch()}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(22,48,42,0.1)',
              color: '#16302A',
              borderRadius: 999,
              px: 1.75,
              ml: tabParam === 'all' ? 0 : { sm: 'auto' },
            }}
          >
            {tabParam === 'properties' ? 'Filter' : 'Apply'}
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
        {!hasQuery && tabParam !== 'properties' ? (
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
              <div>
                Or open the <strong>Properties</strong> tab to browse the latest listings.
              </div>
            </Stack>
          </Box>
        ) : (
          <TabEnter tabKey={tabParam}>
            <Typography sx={{ mb: 2, color: '#5C675F', fontSize: 13.5 }}>
              {tabParam === 'properties' ? (
                <>
                  {propertyTabQuery ? (
                    <>
                      Filtered properties
                      {qParam ? (
                        <>
                          {' '}
                          for <strong style={{ color: '#16302A' }}>{qParam}</strong>
                        </>
                      ) : null}
                    </>
                  ) : (
                    'Latest properties'
                  )}
                  {loading
                    ? ' · loading…'
                    : totalHits
                      ? ` · showing ${properties.length} of ${totalHits}`
                      : ''}
                </>
              ) : (
                <>
                  Results for <strong style={{ color: '#16302A' }}>{qParam || 'filters'}</strong>
                  {loading ? ' · searching…' : totalHits ? ` · ${totalHits} hit${totalHits === 1 ? '' : 's'}` : ''}
                </>
              )}
            </Typography>
            {tabParam !== 'properties' && searchState.error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
                Search request failed: {searchState.error.message}. Check that the API gateway is running and you are
                logged in.
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
              <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>
                {renderProperties()}
                {propertyHasMore && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button
                      onClick={() => {
                        void loadMoreProperties();
                      }}
                      disabled={loadingMoreProperties}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#16302A',
                        bgcolor: 'rgba(22,48,42,0.08)',
                        borderRadius: 999,
                        px: 2.5,
                      }}
                    >
                      {loadingMoreProperties ? 'Loading…' : 'Load more properties'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
            {tabParam === 'posts' && (
              <Box sx={{ ...MATTE_PANEL, borderRadius: CARD_RADIUS, p: 1.75 }}>{renderPosts()}</Box>
            )}
          </TabEnter>
        )}

        <Divider sx={{ my: 3, borderColor: 'rgba(22,48,42,0.08)' }} />
        <Typography sx={{ fontSize: 12, color: 'rgba(22,48,42,0.5)', textAlign: 'center' }}>
          {tabParam === 'properties' ? 'Browse published properties' : 'ZPC search · People · Properties · Posts'}
        </Typography>
      </Box>
    </ScrollablePageShell>
  );
};

export default SearchPage;
