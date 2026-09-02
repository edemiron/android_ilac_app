/**
 * `react-test-renderer` icin minimal tip bildirimi.
 *
 * Paket `@types/react-test-renderer` kurulu degil ve tsc "implicitly has an
 * 'any' type" hatasi veriyordu. Yalnizca testlerde kullaniliyor; ayri bir
 * devDependency eklemek yerine modulu bildiriyoruz.
 */
declare module 'react-test-renderer';
