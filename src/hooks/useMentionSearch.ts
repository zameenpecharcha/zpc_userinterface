import { useEffect, useMemo, useRef } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_USERS_LIGHT } from '../graphql/user';
import { MY_PROPERTIES, PUBLIC_PROPERTIES } from '../graphql/property';
import {
  flattenMentionItems,
  rankMentionPeople,
  rankMentionProperties,
  type MentionItem,
  type MentionPerson,
  type MentionProperty,
} from '../utils/mentionMatch';

type Options = {
  query: string;
  open: boolean;
  includePeople?: boolean;
  includeProperties?: boolean;
  localPeople?: MentionPerson[];
};

function toMentionProperty(prop: any): MentionProperty {
  const subtitle = [prop.projectName, prop.location, prop.city].filter(Boolean).join(' · ');
  return {
    id: String(prop.id),
    title: prop.title || prop.projectName || 'Property',
    subtitle: subtitle || prop.propertyCode || 'Property',
  };
}

export function useMentionSearch({
  query,
  open,
  includePeople = true,
  includeProperties = true,
  localPeople = [],
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchUsers, peopleState] = useLazyQuery(SEARCH_USERS_LIGHT, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const [searchPublicProperties, publicState] = useLazyQuery(PUBLIC_PROPERTIES, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const [searchMyProperties, mineState] = useLazyQuery(MY_PROPERTIES, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const term = query.trim();

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!open) return undefined;
    timerRef.current = setTimeout(() => {
      if (includePeople && term.length >= 1) {
        searchUsers({ variables: { search: term, page: 1, limit: 12 } });
      }
      if (includeProperties && term.length >= 1) {
        searchPublicProperties({
          variables: { search: term, page: 1, limit: 20 },
        });
        if (typeof localStorage !== 'undefined' && localStorage.getItem('token')) {
          searchMyProperties({ variables: { page: 1, limit: 50 } });
        }
      }
    }, term.length === 1 ? 120 : 160);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    open,
    term,
    includePeople,
    includeProperties,
    searchUsers,
    searchPublicProperties,
    searchMyProperties,
  ]);

  const remotePeople: MentionPerson[] = useMemo(() => {
    return (peopleState.data?.users ?? []).map((user: any) => ({
      id: String(user.id),
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `User ${user.id}`,
      subtitle: user.role || user.address || user.email || '',
      photoUrl: user.profilePhotoSignedUrl || user.profilePhoto || null,
    }));
  }, [peopleState.data]);

  const people = useMemo(() => {
    const merged = new Map<string, MentionPerson>();
    [...localPeople, ...remotePeople].forEach((person) => {
      if (!merged.has(person.id)) merged.set(person.id, person);
    });
    return rankMentionPeople(Array.from(merged.values()), term).slice(0, 8);
  }, [localPeople, remotePeople, term]);

  const properties: MentionProperty[] = useMemo(() => {
    const merged = new Map<string, MentionProperty>();
    const publicRows = publicState.data?.publicProperties?.properties ?? [];
    const mineRows = mineState.data?.myProperties?.properties ?? [];
    [...mineRows, ...publicRows].forEach((prop: any) => {
      const row = toMentionProperty(prop);
      if (!merged.has(row.id)) merged.set(row.id, row);
    });
    return rankMentionProperties(Array.from(merged.values()), term).slice(0, 8);
  }, [publicState.data, mineState.data, term]);

  const items: MentionItem[] = useMemo(
    () => flattenMentionItems(includePeople ? people : [], includeProperties ? properties : []),
    [includePeople, includeProperties, people, properties],
  );

  return {
    term,
    people,
    properties,
    items,
    loadingPeople: includePeople && peopleState.loading,
    loadingProperties: includeProperties && (publicState.loading || mineState.loading),
    peopleError: peopleState.error,
    propertyError: publicState.error || mineState.error,
  };
}
