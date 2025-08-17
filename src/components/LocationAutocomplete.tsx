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

interface LocationSuggestion {
  reference: string;
  placeId: string;
  description: string;
  lat: number;
  lng: number;
  types: string[];
}

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
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchSuggestionsImmediate = async (input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setSearchError(null);

    try {
      console.log('Fetching suggestions for:', input); // Debug log

      const { data, errors } = await client.query({
        query: OLA_AUTOCOMPLETE_QUERY,
        variables: { input },
        fetchPolicy: 'no-cache', // Disable caching completely
      });

      console.log('GraphQL Response:', { data, errors }); // Debug log

      if (errors) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.olaAutocomplete) {
        setSuggestions(data.olaAutocomplete);
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

  // Reduced debounce time for testing
  const fetchSuggestions = useDebounce(fetchSuggestionsImmediate, 100);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('Input changed:', newValue); // Debug log
    onChange(newValue);
    setAnchorEl(e.currentTarget);
    fetchSuggestions(newValue);
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    console.log('Selected suggestion:', suggestion); // Debug log
    onChange(suggestion.description);
    onLocationSelect({
      address: suggestion.description,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
    });
    setSuggestions([]);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl) && suggestions.length > 0;
  const id = open ? 'location-popper' : undefined;

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <TextField
        fullWidth
        placeholder="Enter your location"
        value={value}
        onChange={handleInputChange}
        error={error}
        helperText={helperText}
        InputProps={{
          startAdornment: <LocationOn sx={{ color: '#9CA3AF', mr: 1 }} />,
          endAdornment: loading && <CircularProgress size={20} />,
          sx: {
            bgcolor: '#F9FAFB',
            '&:hover': { bgcolor: '#F3F4F6' },
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
        <Paper elevation={3} sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
          {searchError ? (
            <Box p={2}>
              <Typography color="error">{searchError}</Typography>
            </Box>
          ) : (
            <List>
              {suggestions.map((suggestion) => (
                <ListItemButton
                  key={suggestion.placeId}
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{
                    '&:hover': {
                      bgcolor: '#F3F4F6',
                    },
                  }}
                >
                  <LocationOn sx={{ color: '#9CA3AF', mr: 1 }} />
                  <ListItemText 
                    primary={suggestion.description}
                    secondary={suggestion.types?.join(', ')}
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