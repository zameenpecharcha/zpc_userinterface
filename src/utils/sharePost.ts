export type ShareablePost = {
  id: string | number;
  title?: string | null;
  content?: string | null;
};

export function buildPostShareUrl(postId: string | number): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/home?post=${encodeURIComponent(String(postId))}`;
}

export function buildPostShareText(post: ShareablePost, url: string): string {
  const title = (post.title || '').trim();
  const content = (post.content || '')
    .trim()
    .replace(/\s+/g, ' ');
  const preview = content.length > 160 ? `${content.slice(0, 157)}...` : content;
  const head = title || 'Check out this post on ZPC';
  return preview ? `${head}\n\n${preview}\n\n${url}` : `${head}\n\n${url}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function gmailShareUrl(subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
