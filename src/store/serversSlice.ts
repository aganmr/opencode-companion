import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** A user-saved opencode server (added via "Enter Manual URL"). */
export type Server = {
  id: string;
  /** Display name; empty string when the user left it blank. */
  name: string;
  scheme: 'http' | 'https';
  host: string;
  port: number;
  createdAt: number;
};

export type ServerInput = {
  name: string;
  scheme: 'http' | 'https';
  host: string;
  port: number;
};

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** The full URL the Connect screen opens for a saved server (server root). */
export function serverUrl(s: Server): string {
  return `${s.scheme}://${s.host}:${s.port}/`;
}

/** Servers without a name show "host:port" as their label. */
export function serverDisplayName(s: Server): string {
  return s.name.trim() !== '' ? s.name : `${s.host}:${s.port}`;
}

/** Saved servers (unlimited, unlike recent sessions). */
const serversSlice = createSlice({
  name: 'servers',
  initialState: [] as Server[],
  reducers: {
    addServer: {
      /** Append a server. A ServerInput gets a fresh id/createdAt; a full
       *  Server (legacy migration) is kept as-is. */
      reducer(state, action: PayloadAction<Server>) {
        return [...state, action.payload];
      },
      prepare(input: ServerInput | Server) {
        if ('id' in input) {
          return { payload: input };
        }
        return {
          payload: {
            id: makeId(),
            name: input.name.trim(),
            scheme: input.scheme,
            host: input.host.trim(),
            port: input.port,
            createdAt: Date.now(),
          } as Server,
        };
      },
    },
    /** Replace the fields of an existing server, keeping id and createdAt. */
    updateServer(state, action: PayloadAction<{ id: string; input: ServerInput }>) {
      const { id, input } = action.payload;
      return state.map((s) =>
        s.id === id
          ? {
              ...s,
              name: input.name.trim(),
              scheme: input.scheme,
              host: input.host.trim(),
              port: input.port,
            }
          : s
      );
    },
    deleteServer(state, action: PayloadAction<string>) {
      return state.filter((s) => s.id !== action.payload);
    },
    /** Remove all saved servers (Settings screen). */
    clearServers() {
      return [];
    },
  },
});

export const { addServer, updateServer, deleteServer, clearServers } =
  serversSlice.actions;
export default serversSlice.reducer;
