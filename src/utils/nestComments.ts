/**
 * Builds a nested comment tree from flat lists and/or server-nested replies.
 * Preserves multi-level reply chains (reply → reply → …).
 */
export function nestComments(comments: any[] | null | undefined): any[] {
  if (!comments?.length) return [];

  const nodes = new Map<string, any>();

  const ensureNode = (raw: any) => {
    const id = String(raw.id);
    const existing = nodes.get(id);
    if (existing) {
      nodes.set(id, {
        ...existing,
        ...raw,
        replies: existing.replies?.length ? existing.replies : [],
      });
      return nodes.get(id)!;
    }
    const node = { ...raw, replies: [] as any[] };
    nodes.set(id, node);
    return node;
  };

  const ingest = (raw: any) => {
    const node = ensureNode(raw);
    const nested = Array.isArray(raw.replies) ? raw.replies : [];
    nested.forEach((reply: any) => {
      const child = ingest(reply);
      if (!(node.replies || []).some((r: any) => String(r.id) === String(child.id))) {
        node.replies = (node.replies || []).concat([child]);
      }
    });
    return node;
  };

  comments.forEach(ingest);

  const claimed = new Set<string>();
  const roots: any[] = [];

  Array.from(nodes.values()).forEach((node) => {
    (node.replies || []).forEach((reply: any) => claimed.add(String(reply.id)));
  });

  comments.forEach((raw) => {
    const id = String(raw.id);
    if (claimed.has(id)) return;

    const node = nodes.get(id)!;
    const parentId =
      raw.parentCommentId != null && raw.parentCommentId !== ''
        ? String(raw.parentCommentId)
        : '';

    if (parentId && nodes.has(parentId)) {
      const parent = nodes.get(parentId)!;
      if (!(parent.replies || []).some((r: any) => String(r.id) === id)) {
        parent.replies = (parent.replies || []).concat([node]);
      }
      claimed.add(id);
    } else if (!parentId) {
      roots.push(node);
    } else {
      // Orphaned reply (parent missing from page) — still show as root-ish entry
      roots.push(node);
    }
  });

  return roots;
}
