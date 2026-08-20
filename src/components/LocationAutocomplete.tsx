import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Popper,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { useApolloClient, gql } from '@apollo/client';
import { normalizeLocationSuggestions, type LocalitySuggestion } from '../utils/locationLabel';

// Query exactly matching the backend schema
const OLA_AUTOCOMPLETE_QUERY = gql`
  query OlaAutocomplete($input: String!) {
    olaAutocomplete(input: $input) {
      reference
      placeId
      description
      lat
      lng
      types
    }
  }
`;

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { address: string; latitude: number; longitude: number }) => void;
  error?: boolean;
  helperText?: string;
}

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setTimeoutId(
      setTimeout(() => {
        callback(...args);
      }, delay)
    );
  }, [callback, delay, timeoutId]);
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  error,
  helperText,
}) => {
  const client = useApolloClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [suggestions, setSuggestions] = useState<LocalitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchSuggestionsImmediate = async (input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchError(null);

    try {
      const queryPromise = client.query({
        query: OLA_AUTOCOMPLETE_QUERY,
        variables: { input: input.trim() },
        fetchPolicy: 'no-cache',
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Location search timed out')), 8000);
      });
      const { data, errors } = await Promise.race([queryPromise, timeoutPromise]);

      if (errors) {
        throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
      }

      if (data?.olaAutocomplete) {
        setSuggestions(normalizeLocationSuggestions(data.olaAutocomplete));
      } else {
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error('Location search error:', err);
      setSearchError(err.message || 'Failed to fetch location suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = useDebounce(fetchSuggestionsImmediate, 280);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setAnchorEl(e.currentTarget);
    fetchSuggestions(newValue);
  };

  const handleSuggestionClick = (suggestion: LocalitySuggestion) => {
    const address = suggestion.label || suggestion.description;
    onChange(address);
    onLocationSelect({
      address,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
    });
    setSuggestions([]);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl) && (suggestions.length > 0 || !!searchError);
  const id = open ? 'location-popper' : undefined;

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <TextField
        fullWidth
        placeholder="Search area, city (e.g. Madhapur, Hyderabad)"
        value={value}
        onChange={handleInputChange}
        error={error}
        helperText={helperText}
        InputProps={{
          startAdornment: <LocationOn sx={{ color: '#A89F84', mr: 1 }} />,
          endAdornment: loading && <CircularProgress size={20} />,
          sx: {
            bgcolor: '#EBE6D4',
            '&:hover': { bgcolor: '#E8E2CE' },
            borderRadius: 2,
            px: 1,
            height: 56,
          },
        }}
      />

      <Popper
        id={id}
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ width: anchorEl?.clientWidth, zIndex: 1300 }}
      >
        <Paper elevation={3} className="zpc-overlay-scroll" sx={{ mt: 1, maxHeight: 300, overflow: 'auto', bgcolor: '#F7F3E8' }}>
          {searchError ? (
            <Box p={2}>
              <Typography color="error">{searchError}</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {suggestions.map((suggestion) => (
                <ListItemButton
                  key={suggestion.placeId || suggestion.label}
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{
                    alignItems: 'flex-start',
                    py: 1.1,
                    '&:hover': {
                      bgcolor: '#E8E2CE',
                    },
                  }}
                >
                  <LocationOn sx={{ color: '#A89F84', mr: 1, mt: 0.35, fontSize: 20 }} />
                  <ListItemText
                    primary={suggestion.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#16302A',
                      lineHeight: 1.35,
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      </Popper>
    </Box>
  );
};

export default LocationAutocomplete;
