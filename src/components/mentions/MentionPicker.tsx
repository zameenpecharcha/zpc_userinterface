import React from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { MATTE_INSET, THIN_CREAM_SCROLLBAR } from '../../theme/surfaces';
import { ZPC_MOTION } from '../../theme/motion';
import { nameInitials, stringToColor } from '../../utils/mentions';
import { highlightMentionMatch, type MentionItem, type MentionPerson, type MentionProperty } from '../../utils/mentionMatch';

type MentionPickerProps = {
  open: boolean;
  query: string;
  items: MentionItem[];
  people: MentionPerson[];
  properties: MentionProperty[];
  loadingPeople?: boolean;
  loadingProperties?: boolean;
  selectedIndex?: number;
  includePeople?: boolean;
  includeProperties?: boolean;
  width?: number | string;
  onHoverIndex?: (index: number) => void;
  onSelect: (item: MentionItem) => void;
  onClose?: () => void;
};

const Highlighted = ({ text, query }: { text: string; query: string }) => (
  <>
    {highlightMentionMatch(text, query).map((part, index) => (
      <Box
        key={`${part.text}-${index}`}
        component="span"
        sx={{
          fontWeight: part.hit ? 800 : 600,
          color: part.hit ? '#16302A' : 'inherit',
          bgcolor: part.hit ? 'rgba(22,48,42,0.12)' : 'transparent',
          borderRadius: 0.5,
          px: part.hit ? 0.15 : 0,
        }}
      >
        {part.text}
      </Box>
    ))}
  </>
);

const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <Box
    sx={{
      ...MATTE_INSET,
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: 0.7,
      position: 'sticky',
      top: 0,
      zIndex: 1,
    }}
  >
    {icon}
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#5C675F' }}>
      {label}
    </Typography>
  </Box>
);

const StatusRow = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ px: 1.5, py: 1.1, display: 'flex', alignItems: 'center', gap: 1 }}>
    {children}
  </Box>
);

export default function MentionPicker({
  open,
  query,
  items,
  people,
  properties,
  loadingPeople = false,
  loadingProperties = false,
  selectedIndex = 0,
  includePeople = true,
  includeProperties = true,
  width = 320,
  onHoverIndex,
  onSelect,
  onClose,
}: MentionPickerProps) {
  if (!open) return null;
  const term = query.trim();
  const waiting = term.length < 1;
  let runningIndex = -1;

  return (
    <Paper
      elevation={10}
      className="zpc-overlay-scroll"
      sx={{
        width,
        maxWidth: 'min(360px, calc(100vw - 24px))',
        maxHeight: 280,
        overflow: 'auto',
        borderRadius: 2.25,
        border: '1px solid rgba(22,48,42,0.16)',
        bgcolor: '#F7F3E7',
        boxShadow: '0 16px 40px rgba(10,18,16,0.18), 0 2px 8px rgba(10,18,16,0.08)',
        animation: `zpcPopupIn ${ZPC_MOTION.popover}ms ${ZPC_MOTION.ease} both`,
        ...THIN_CREAM_SCROLLBAR,
      }}
    >
      <Box sx={{ px: 1.25, pt: 1, pb: 0.5, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#16302A' }}>
            {waiting ? 'Mention someone or a property' : `Matching “${term}”`}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#5C675F', mt: 0.15 }}>
            Names and listings, letter-first
          </Typography>
        </Box>
        {onClose && (
          <IconButton
            size="small"
            aria-label="Close mentions"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            sx={{ mt: -0.4, mr: -0.6, color: '#5C675F' }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
      <List dense disablePadding>
        {includePeople && (
          <>
            <SectionLabel icon={<PersonOutlineIcon sx={{ fontSize: 16, color: '#16302A' }} />} label="People" />
            {waiting ? (
              <StatusRow>
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Type a letter to search people</Typography>
              </StatusRow>
            ) : loadingPeople && people.length === 0 ? (
              <StatusRow>
                <CircularProgress size={14} sx={{ color: '#16302A' }} />
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Searching people…</Typography>
              </StatusRow>
            ) : people.length === 0 ? (
              <StatusRow>
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>No people match those letters</Typography>
              </StatusRow>
            ) : (
              people.map((person) => {
                runningIndex += 1;
                const index = runningIndex;
                return (
                  <ListItemButton
                    key={`person-${person.id}`}
                    selected={index === selectedIndex}
                    onMouseEnter={() => onHoverIndex?.(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect({ kind: 'person', person });
                    }}
                    sx={{ py: 0.7, px: 1.25 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar
                        src={person.photoUrl || undefined}
                        sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 700, bgcolor: stringToColor(person.name) }}
                      >
                        {nameInitials(person.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Highlighted text={person.name} query={term} />}
                      secondary={person.subtitle || 'Person'}
                      primaryTypographyProps={{ noWrap: true, fontSize: 13.5, component: 'div' }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: 11.5 }}
                    />
                  </ListItemButton>
                );
              })
            )}
          </>
        )}
        {includeProperties && (
          <>
            <SectionLabel icon={<HomeWorkOutlinedIcon sx={{ fontSize: 16, color: '#16302A' }} />} label="Properties" />
            {waiting ? (
              <StatusRow>
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Type a letter to search listings</Typography>
              </StatusRow>
            ) : loadingProperties && properties.length === 0 ? (
              <StatusRow>
                <CircularProgress size={14} sx={{ color: '#16302A' }} />
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>Searching properties…</Typography>
              </StatusRow>
            ) : properties.length === 0 ? (
              <StatusRow>
                <Typography sx={{ fontSize: 12.5, color: '#5C675F' }}>No properties match those letters</Typography>
              </StatusRow>
            ) : (
              properties.map((property) => {
                runningIndex += 1;
                const index = runningIndex;
                return (
                  <ListItemButton
                    key={`property-${property.id}`}
                    selected={index === selectedIndex}
                    onMouseEnter={() => onHoverIndex?.(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect({ kind: 'property', property });
                    }}
                    sx={{ py: 0.7, px: 1.25 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(22,48,42,0.1)', color: '#16302A' }}>
                        <HomeWorkOutlinedIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Highlighted text={property.title} query={term} />}
                      secondary={property.subtitle || 'Property'}
                      primaryTypographyProps={{ noWrap: true, fontSize: 13.5, component: 'div' }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: 11.5 }}
                    />
                  </ListItemButton>
                );
              })
            )}
          </>
        )}
      </List>
    </Paper>
  );
}

export function mentionKeyHandler(
  event: React.KeyboardEvent,
  items: MentionItem[],
  selectedIndex: number,
  setSelectedIndex: (index: number) => void,
  onSelect: (item: MentionItem) => void,
  onClose: () => void,
): boolean {
  if (!items.length) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return true;
    }
    if (event.key === 'Tab') {
      onClose();
      return false;
    }
    return false;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setSelectedIndex((selectedIndex + 1) % items.length);
    return true;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
    return true;
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    onSelect(items[selectedIndex] || items[0]);
    return true;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return true;
  }
  return false;
}
