import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import { AddServerScreen } from '../AddServerScreen';
import { theme } from '../../theme';
import { makeStore } from '../../store/rootReducer';
import type { Server } from '../../store/serversSlice';

const goBack = jest.fn();

function renderAddServer(params?: { server?: Server }, preloaded?: Parameters<typeof makeStore>[0]) {
  const store = makeStore(preloaded);
  return {
    store,
    render: render(
      <Provider store={store}>
        <PaperProvider theme={theme}>
          <AddServerScreen
            route={{ params } as never}
            navigation={{ goBack } as never}
          />
        </PaperProvider>
      </Provider>
    ),
  };
}

async function fillAndSave() {
  await fireEvent.changeText(screen.getByTestId('addserver-host'), '192.168.0.131');
  await fireEvent.changeText(screen.getByTestId('addserver-port'), '8091');
  await fireEvent.press(screen.getByTestId('addserver-save'));
}

describe('AddServerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Add Server title and pre-fills the default port 4096', async () => {
    await renderAddServer().render;
    expect(screen.getByText('Add Server')).toBeTruthy();
    expect(screen.getByTestId('addserver-port').props.value).toBe('4096');
  });

  it('blocks saving with empty URL/port and shows the required-fields error', async () => {
    const { store, render: r } = renderAddServer();
    await r;
    await fireEvent.press(screen.getByTestId('addserver-save'));

    expect(await screen.findByText('URL and Port are required.')).toBeTruthy();
    expect(store.getState().servers).toHaveLength(0);
    expect(goBack).not.toHaveBeenCalled();
  });

  it('saves a valid server and goes back immediately (confirmation lives on Home)', async () => {
    const { store, render: r } = renderAddServer();
    await r;
    await fireEvent.changeText(screen.getByTestId('addserver-name'), 'Test PC');
    await fillAndSave();

    const [s] = store.getState().servers;
    expect(s).toMatchObject({
      name: 'Test PC',
      scheme: 'http',
      host: '192.168.0.131',
      port: 8091,
    });
    expect(s.id).toBeTruthy();
    // The landing page shows the "Server saved" snackbar on focus — this
    // screen flags the save and leaves at once, no snackbar of its own.
    expect(store.getState().ui.lastServerSavedAt).toBeGreaterThan(0);
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Server saved')).toBeNull();
  });

  it('respects the scheme toggle', async () => {
    const { store, render: r } = renderAddServer();
    await r;
    await fireEvent.press(screen.getByText('https'));
    await fillAndSave();

    expect(store.getState().servers[0].scheme).toBe('https');
  });

  it('rejects ports outside 1-65535', async () => {
    const { store, render: r } = renderAddServer();
    await r;
    await fireEvent.changeText(screen.getByTestId('addserver-host'), 'example.com');
    await fireEvent.changeText(screen.getByTestId('addserver-port'), '99999');
    await fireEvent.press(screen.getByTestId('addserver-save'));

    expect(await screen.findByText('Port must be a whole number between 1 and 65535.')).toBeTruthy();
    expect(store.getState().servers).toHaveLength(0);
  });

  it('normalizes pasted full URLs (strips scheme and trailing slash)', async () => {
    const { store, render: r } = renderAddServer();
    await r;
    await fireEvent.changeText(screen.getByTestId('addserver-host'), 'http://example.com/');
    await fireEvent.changeText(screen.getByTestId('addserver-port'), '8091');
    await fireEvent.press(screen.getByTestId('addserver-save'));

    const [s] = store.getState().servers;
    expect(s).toMatchObject({ host: 'example.com', port: 8091 });
  });

  it('trims name and host when saving', async () => {
    const { store, render: r } = renderAddServer();
    await r;
    await fireEvent.changeText(screen.getByTestId('addserver-name'), '  Padded  ');
    await fireEvent.changeText(screen.getByTestId('addserver-host'), '  host.com /');
    await fireEvent.changeText(screen.getByTestId('addserver-port'), '8091');
    await fireEvent.press(screen.getByTestId('addserver-save'));

    const [s] = store.getState().servers;
    expect(s.name).toBe('Padded');
    expect(s.host).toBe('host.com');
  });

  it('edit mode pre-fills the form and updates the existing server', async () => {
    const server: Server = {
      id: 's1',
      name: 'Old',
      scheme: 'https',
      host: 'old.com',
      port: 1234,
      createdAt: 1,
    };
    const { store, render: r } = renderAddServer({ server }, { servers: [server] });
    await r;

    expect(screen.getByText('Edit Server')).toBeTruthy();
    expect(screen.getByText('Save Changes')).toBeTruthy();
    expect(screen.getByTestId('addserver-name').props.value).toBe('Old');
    expect(screen.getByTestId('addserver-host').props.value).toBe('old.com');
    expect(screen.getByTestId('addserver-port').props.value).toBe('1234');

    await fireEvent.changeText(screen.getByTestId('addserver-port'), '9999');
    await fireEvent.press(screen.getByTestId('addserver-save'));

    // The same server (id/createdAt preserved) with the new port; the
    // landing page is told about the save and we go back at once.
    const [s] = store.getState().servers;
    expect(s).toMatchObject({ id: 's1', name: 'Old', scheme: 'https', host: 'old.com', port: 9999 });
    expect(s.createdAt).toBe(1);
    expect(store.getState().ui.lastServerSavedAt).toBeGreaterThan(0);
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
