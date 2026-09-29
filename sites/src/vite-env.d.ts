/// <reference types="vite/client" />
declare module "topojson-client" {
  export function feature(topology: unknown, object: unknown): unknown;
}
declare module "world-atlas/land-110m.json" {
  const value: unknown;
  export default value;
}
