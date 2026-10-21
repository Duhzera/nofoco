import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native' || specifier.startsWith('react-native/')) {
    return nextResolve(
      'data:text/javascript,export default {}; export const Platform = { OS: "web", select: (obj) => obj.default ?? obj.web ?? Object.values(obj)[0] };',
      context,
    );
  }
  if (specifier === '@react-native-async-storage/async-storage') {
    return nextResolve(
      'data:text/javascript,export default { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };',
      context,
    );
  }

  let target = specifier;

  if (target.startsWith('@/')) {
    const cwd = process.cwd().replace(/\\/g, '/');
    target = `file:///${cwd}/src/${target.slice(2)}`;
  }

  // Se for relativo a um parentURL
  let resolvedUrl = target;
  if (target.startsWith('.') && context.parentURL) {
    resolvedUrl = new URL(target, context.parentURL).href;
  }

  // Se for URL file:///
  if (resolvedUrl.startsWith('file:///')) {
    const filePath = fileURLToPath(resolvedUrl);
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.js') && !filePath.endsWith('.mjs')) {
      if (fs.existsSync(`${filePath}.ts`)) {
        resolvedUrl = `${resolvedUrl}.ts`;
      } else if (fs.existsSync(`${filePath}/index.ts`)) {
        resolvedUrl = `${resolvedUrl}/index.ts`;
      }
    }
  }

  return nextResolve(resolvedUrl, context);
}
