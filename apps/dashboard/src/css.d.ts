// TypeScript 6.0 enables noUncheckedSideEffectImports by default, which
// requires an ambient declaration for side-effect-only imports (e.g.
// `import "./globals.css"`) that have no runtime type declarations.
declare module "*.css";
