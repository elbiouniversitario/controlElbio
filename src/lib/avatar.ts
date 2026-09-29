/** Avatar SVG (data URI) con las iniciales, para jugadores sin foto. */
export function initialsAvatar(firstName: string, lastName: string): string {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || '?';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" fill="#0d2d59"/>` +
    `<text x="48" y="48" dy=".35em" text-anchor="middle" fill="#ffffff" ` +
    `font-family="Arial, sans-serif" font-size="38" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
