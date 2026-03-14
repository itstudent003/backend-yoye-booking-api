export function generateBookingCode(): string {
  const yy = 'YY';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  return `${yy}-${random}`;
}
