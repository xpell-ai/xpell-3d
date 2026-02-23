import dts from "vite-plugin-dts";

export default {
  server: { port: 3001 },

  build: {
    lib: {
      entry: "./src/index.ts",
      name: "Xpell3D", // only used for UMD; can be anything
      formats: ["es", "cjs"], // <-- drop umd unless you truly need it
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    target: "es2020",
    minify: true,
    outDir: "dist",
    rollupOptions: {
      external: ["three", "cannon-es", "three-to-cannon", "xpell-ui", "xpell-core"],
      output: {
        exports: "named",
      },
    },
  },

  plugins: [
    dts({
      // IMPORTANT: emit types into dist so package.json "types" works
      outDir: "dist",
      entryRoot: "src",
      insertTypesEntry: true,
      rollupTypes: true,
      // if you have DOM-only files you don't want in types, exclude them here:
      exclude: ["src/ignore/**", "public/**", "examples/**", "example/**"],
      skipDiagnostics: false,
      logDiagnostics: true,
    }),
  ],
};
