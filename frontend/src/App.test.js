/*
 * Shell tests.
 *
 * The default create-react-app test looked for a "learn
 * react" link that this application never had, so it
 * could only ever fail. These check the two things the
 * shell is actually responsible for in Sprint 3: it
 * renders the public view to a signed-out visitor, and
 * it does not offer the signed-in entries to one.
 *
 * The API is not running during a unit test, so the
 * client is mocked; the live-API paths are covered by
 * backend/tests/auth.test.js.
 */

import { render, screen, waitFor } from '@testing-library/react';

import App from './App';
import { AuthProvider } from './context/AuthContext';

jest.mock('./api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(() => Promise.reject({ message: 'offline', status: 0 })),
        post: jest.fn(() => Promise.reject({ message: 'offline', status: 0 })),
        put: jest.fn(() => Promise.reject({ message: 'offline', status: 0 }))
    },
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(() => null),
    setSessionExpiredHandler: jest.fn(),
    API_BASE: 'http://localhost:5000'
}));

function renderApp() {
    return render(
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}

test('a signed-out visitor sees the public search view', async () => {
    renderApp();

    await waitFor(() =>
        expect(
            screen.getByText(/find your study group/i)
        ).toBeInTheDocument()
    );
});

test('a signed-out visitor is offered sign in and create account', async () => {
    renderApp();

    await waitFor(() =>
        expect(
            screen.getByRole('button', { name: /^sign in$/i })
        ).toBeInTheDocument()
    );

    expect(
        screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
});

test('the create-a-group entry is hidden from a signed-out visitor', async () => {
    renderApp();

    await waitFor(() =>
        expect(
            screen.getByText(/find your study group/i)
        ).toBeInTheDocument()
    );

    expect(
        screen.queryByRole('link', { name: /create a group/i })
    ).not.toBeInTheDocument();
});
