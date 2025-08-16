export function getSeasonFromDate(dateStr: string): '春' | '夏' | '秋' | '冬' {
  const month = new Date(dateStr).getMonth() + 1;
  if ([3, 4, 5].includes(month)) return '春';
  if ([6, 7, 8].includes(month)) return '夏';
  if ([9, 10, 11].includes(month)) return '秋';
  return '冬';
}
