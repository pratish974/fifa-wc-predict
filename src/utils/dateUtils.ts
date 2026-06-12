const getRawKickoffLabel = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const v: any = value;
    const date = v?.ist?.date ?? v?.date;
    const time = v?.ist?.time ?? v?.time;

    if (typeof date === 'string' || typeof time === 'string') {
      return [date, time].filter(Boolean).join(' ').trim();
    }
  }

  return null;
};

const parseDateAndTime = (datePart: string, timePart: string): Date | null => {
  const trimmedDate = datePart.trim();
  const trimmedTime = timePart.trim();

  const amPmMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]) % 12;
    const minutes = Number(amPmMatch[2]);
    const meridiem = amPmMatch[3].toUpperCase();
    if (meridiem === 'PM') {
      hours += 12;
    }

    const isoLike = `${trimmedDate}T${String(hours).padStart(2, '0')}:${String(
      minutes,
    ).padStart(2, '0')}:00+05:30`;
    const parsed = new Date(isoLike);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const combined = new Date(`${trimmedDate} ${trimmedTime}`);
  return isNaN(combined.getTime()) ? null : combined;
};

export const parseMatchDate = (value: unknown): Date | null => {
  if (!value) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object') {
    const v: any = value;

    if (typeof v.toDate === 'function') {
      try {
        const date = v.toDate();
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }

    if (typeof v.seconds === 'number') {
      const ms =
        v.seconds * 1000 +
        (typeof v.nanoseconds === 'number' ? Math.floor(v.nanoseconds / 1e6) : 0);
      const date = new Date(ms);
      return isNaN(date.getTime()) ? null : date;
    }

    const kickoff = v?.ist ?? v;
    const datePart = kickoff?.date;
    const timePart = kickoff?.time;

    if (typeof datePart === 'string' && typeof timePart === 'string') {
      return parseDateAndTime(datePart, timePart);
    }

    if (typeof datePart === 'string') {
      const date = new Date(datePart);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
};

export const formatMatchDate = (date: unknown): string => {
  const raw = getRawKickoffLabel(date);
  if (raw) {
    return raw;
  }

  const parsed = parseMatchDate(date);
  if (!parsed) {
    return String(date ?? '');
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
