import { allSettled, createEvent, createStore, fork, restore } from 'effector';
import { describe, it, expect, vi } from 'vitest';
import {
  attachPaths,
  createRoute,
  createRouterDomain,
  redirect,
  setHistory,
  RouteQuery,
} from '../src';
import { createMemoryHistory } from 'history';
import { Mock } from 'vitest/dist/browser';

function argumentHistory(fn: Mock) {
  return fn.mock.calls.map(([value]) => value);
}

describe('redirect', () => {
  it('Opens `route` on `clock` trigger', async () => {
    const clock = createEvent();
    const route = createRoute({ virtual: true });

    redirect({
      clock,
      route,
    });

    const scope = fork();

    await allSettled(clock, { scope });

    expect(scope.getState(route.$isOpened)).toBeTruthy();
    expect(scope.getState(route.$params)).toEqual({});
    expect(scope.getState(route.$query)).toEqual({});
  });

  it('makes only one record in the history', async () => {
    const history = createMemoryHistory();
    history.replace('/');
    const historyUpdated = vi.fn();
    history.listen((state) =>
      historyUpdated({
        action: state.action,
        pathname: state.location.pathname,
        search: state.location.search,
      })
    );
    const domain = createRouterDomain({
      base: '/#',
    });
    const foo = createRoute({ domain });
    const bar = createRoute({ domain });
    const clock = createEvent();
    attachPaths([
      [foo, '/foo'],
      [bar, '/bar'],
    ]);
    redirect({
      clock,
      route: foo,
    });
    const scope = fork();
    await allSettled(setHistory, {
      scope,
      params: { history, domain },
    });
    expect(argumentHistory(historyUpdated)).toMatchInlineSnapshot('[]');

    await allSettled(clock, { scope });
    expect(argumentHistory(historyUpdated)).toMatchInlineSnapshot(`
      [
        {
          "action": "PUSH",
          "pathname": "/",
          "search": "",
        },
      ]
    `);
  });

  // TODO: Would be cool to make it default behavior
  // However, it'll be a breaking change
  // For now it's just { params: {}, query: {} } if `params/query` is empty
  it.skip('Takes `params` & `query` directly from `clock`', async () => {
    const clock = createEvent<{
      params: { foo: string };
      query: { baz: string };
    }>();
    const route = createRoute<{ foo: string }>();

    redirect({
      clock,
      route,
    });

    const scope = fork();
    await allSettled(clock, {
      scope,
      params: {
        params: { foo: 'bar' },
        query: { baz: 'test' },
      },
    });

    expect(scope.getState(route.$isOpened)).toBeTruthy();
    expect(scope.getState(route.$params)).toEqual({ foo: 'bar' });
    expect(scope.getState(route.$query)).toEqual({ baz: 'test' });
  });

  it('Object-like `params` & `query`', async () => {
    const clock = createEvent();
    const route = createRoute<{ foo: string }>({ virtual: true });

    redirect({
      clock,
      params: { foo: 'bar' },
      query: { baz: 'test' },
      route,
    });

    const scope = fork();
    await allSettled(clock, { scope });

    expect(scope.getState(route.$isOpened)).toBeTruthy();
    expect(scope.getState(route.$params)).toEqual({ foo: 'bar' });
    expect(scope.getState(route.$query)).toEqual({ baz: 'test' });
  });

  it('Store-like `params` & `query`', async () => {
    const clock = createEvent();
    const route = createRoute<{ foo: string }>({ virtual: true });

    redirect({
      clock,
      params: createStore({ foo: 'bar' }),
      query: createStore({ baz: 'test' } as RouteQuery),
      route,
    });

    const scope = fork();
    await allSettled(clock, { scope });

    expect(scope.getState(route.$isOpened)).toBeTruthy();
    expect(scope.getState(route.$params)).toEqual({ foo: 'bar' });
    expect(scope.getState(route.$query)).toEqual({ baz: 'test' });
  });

  it('Function-like `params` & `query`', async () => {
    const clock = createEvent<string>();
    const route = createRoute<{ foo: string }>({ virtual: true });

    redirect({
      clock,
      params: (foo) => ({ foo }),
      query: (foo) => ({ baz: `${foo}-test` }),
      route,
    });

    const scope = fork();
    await allSettled(clock, { scope, params: 'bar' });

    expect(scope.getState(route.$isOpened)).toBeTruthy();
    expect(scope.getState(route.$params)).toEqual({ foo: 'bar' });
    expect(scope.getState(route.$query)).toEqual({
      baz: 'bar-test',
    });
  });

  describe('`replace` option', () => {
    it('primitive variant', async () => {
      const clock = createEvent();
      const route = createRoute();
      const $navigateDone = restore(route.navigate.done, null);

      redirect({
        clock,
        route,
        replace: true,
      });

      const scope = fork();

      await allSettled(clock, { scope });

      expect(scope.getState($navigateDone)).toBeTruthy();
      expect(
        scope.getState($navigateDone.map((data) => data?.params.replace))
      ).toEqual(true);
    });

    it('store variant', async () => {
      const clock = createEvent();
      const route = createRoute();
      const $navigateDone = restore(route.navigate.done, null);

      redirect({
        clock,
        route,
        replace: createStore(true),
      });

      const scope = fork();

      await allSettled(clock, { scope });

      expect(scope.getState($navigateDone)).toBeTruthy();
      expect(
        scope.getState($navigateDone.map((data) => data?.params.replace))
      ).toEqual(true);
    });

    it('fn variant', async () => {
      const clock = createEvent();
      const route = createRoute();
      const $navigateDone = restore(route.navigate.done, null);

      redirect({
        clock,
        route,
        replace: () => true,
      });

      const scope = fork();

      await allSettled(clock, { scope });

      expect(scope.getState($navigateDone)).toBeTruthy();
      expect(
        scope.getState($navigateDone.map((data) => data?.params.replace))
      ).toEqual(true);
    });
  });
});
