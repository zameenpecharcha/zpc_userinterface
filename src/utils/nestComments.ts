/**
 * Ensures replies sit under their parent for one-level display.
 * Handles both nested API payloads and flat lists with parentCommentId.
 */
export function nestComments(comments: any[] | null | undefined): any[] {
  if (!comments?.length) return [];

  const nodes = new Map<string, any>();
  comments.forEach((raw) => {
    const id = String(raw.id);
    const existing = nodes.get(id);
    const fromServer = Array.isArray(raw.replies) ? raw.replies : [];
    nodes.set(id, {
      ...raw,
      replies: existing?.replies?.length ? existing.replies : fromServer.slice(),
    });
  });

  // Index nested reply ids already present on parents
  const claimed = new Set<string>();
  Array.from(nodes.values()).forEach((node) => {
    const nested: any[] = [];
    (node.replies || []).forEach((reply: any) => {
      const rid = String(reply.id);
      claimed.add(rid);
      if (!nodes.has(rid)) {
        nodes.set(rid, { ...reply, replies: [] });
      }
      nested.push(nodes.get(rid));
    });
    node.replies = nested;
  });

  const roots: any[] = [];
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
    } else {
      roots.push(node);
    }
  });

  // One-level threads: hoist any reply-of-reply onto the root comment
  roots.forEach((root) => {
    const flat: any[] = [];
    const walk = (items: any[]) => {
      (items || []).forEach((item) => {
        flat.push({ ...item, replies: [] });
        if (item.replies?.length) walk(item.replies);
      });
    };
    walk(root.replies || []);
    root.replies = flat;
  });

  return roots;
}
