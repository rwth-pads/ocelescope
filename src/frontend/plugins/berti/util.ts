const assignUniqueColors = (strings: string[]) => {
  const numStrings = strings.length;
  const uniqueStrings = Array.from(new Set(strings));
  const colorMap: Record<string, string> = {};

  uniqueStrings.forEach((str, index) => {
    const hue = (index * 360) / numStrings; // even distribution
    const saturation = 70; // percent
    const lightness = 50; // percent (not too dark/light)
    const hsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    colorMap[str] = hsl;
  });

  return colorMap;
};

export default assignUniqueColors;
