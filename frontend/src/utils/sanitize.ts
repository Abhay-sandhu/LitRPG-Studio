import DOMPurify from 'dompurify'

export const sanitizeHtml = (dirtyHtml: string): string => {
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'blockquote', 'a', 'ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'span', 'mark', 'u'],
    ALLOWED_ATTR: ['class', 'style', 'href']
  })
}
