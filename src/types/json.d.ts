declare global {
  interface Json {
    [x: string]: string | number | boolean | Date | Json | JsonArray;
  }

  type JsonArray = Array<string | number | boolean | Date | Json | JsonArray>;
}

export {};
