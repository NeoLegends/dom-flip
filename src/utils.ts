/**
 * The method used for scheduling animations.
 *
 * As of March 2018, requestAnimationFrame callbacks run _after_ rendering in WebKit
 * and EdgeHTML based browsers (which is a bug, it needs to run before), which causes
 * flickering of list items. Using microtask timings fixes these issues, but is detrimental
 * to performance because it causes layout thrashing. Therefore, we only use microtask
 * timing in WebKit and EdgeHTML browsers and proper rAF timing in all others.
 *
 * As soon as these bugs are fixed, we can revert to using rAF timing in all browsers.
 *
 * @see https://youtu.be/cCOL7MC4Pl0?t=1394
 * @see https://bugs.webkit.org/show_bug.cgi?id=177484
 * @see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/15469349/
 */
export const batchCallback: (cb: () => void) => void =
    (navigator.vendor.indexOf('Apple') !== -1 || navigator.userAgent.indexOf('Edge') !== -1)
        ? cb => Promise.resolve().then(cb)
        : requestAnimationFrame;

/**
 * Generates a CSS `translate`-rule compatible string that does a 2D transform.
 *
 * @param {number} dx the X delta
 * @param {number} dy the Y delta
 * @param {number} sx the X scale
 * @param {number} sy the Y scale
 * @return {string} the CSS rule
 */
export const generateTransformString = (dx: number, dy: number, sx: number, sy: number) =>
    `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

/**
 * Determines whether the actual number lies within a close margin to the
 * target number.
 *
 * @param {number} actual The number to check.
 * @param {number} target The target number.
 * @param {number} epsilon The allowed margin of error. Defaults to 1e-5.
 */
export const isCloseTo = (actual: number, target: number, epsilon: number = 1e-5) =>
    Math.abs(actual - target) <= epsilon;
