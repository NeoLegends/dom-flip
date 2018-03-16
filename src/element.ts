declare global {
    interface Window {
        ShadyCSS?: any;
    }
}

/**
 * All used attribute names.
 */
const enum AttributeNames {
    Active = 'active',
    AttrName = 'attr-name',
}

/**
 * Child metadata.
 */
interface ChildData {
    /** The top offset from the parent element, in pixels. */
    top: number;
    /** The left offset from the parent element, in pixels. */
    left: number;
    /** The opacity. */
    opacity: number;
    /** The scale on the x-axis. */
    scaleX: number;
    /** The scale on the y-axis. */
    scaleY: number;
}

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
 */
const batchCallback: (cb: () => void) => void =
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
const generateTransformString = (dx: number, dy: number, sx: number, sy: number) =>
    `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

/**
 * Determines whether the actual number lies within a close margin to the
 * target number.
 *
 * @param {number} actual The number to check.
 * @param {number} target The target number.
 * @param {number} epsilon The allowed margin of error. Defaults to 1e-5.
 */
const isCloseTo = (actual: number, target: number, epsilon: number = 1e-5) =>
    Math.abs(actual - target) <= epsilon;

/**
 * The regex used to parse the transform matrix string.
 */
const transformRegex = /matrix\((-?\d*\.?\d+),\s*0,\s*0,\s*(-?\d*\.?\d+),\s*0,\s*0\)/;

// tslint:disable:max-line-length

/**
 * The template element used for initially stamping dom-flip's DOM.
 */
const template = document.createElement('template') as HTMLTemplateElement;
template.innerHTML = `
    <style>
        ::slotted(*) {
            transition: transform var(--transition-duration, 200ms) var(--transition-easing, ease-out) var(--transition-delay, 0),
                        opacity var(--transition-duration, 200ms) var(--transition-easing, ease-out) var(--transition-delay, 0);
        }
    </style>

    <slot></slot>
`;

// tslint:enable

if (window.ShadyCSS) {
    window.ShadyCSS.prepareTemplate(template, 'dom-flip');
}

/**
 * `dom-flip`
 *
 * FLIP move animations for web components.
 *
 * Wrap this around your child elements and they will slide smoothly over the screen
 * if their order or position changes.
 *
 * @example
 * ```html
 * <!-- The divs' positions will be animated if they change. -->
 * <dom-flip>
 *   <div>Item 1</div
 *   <div>Item 2</div
 *   <div>Item 3</div
 *   <div>Item 4</div
 * </dom-flip>
 * ```
 *
 * @demo demo/index.html
 * @see https://aerotwist.com/blog/flip-your-animations/
 */
export default class DomFlip extends HTMLElement {
    static get observedAttributes(): string[] {
        return [AttributeNames.Active, AttributeNames.AttrName];
    }

    /**
     * Indicates whether the element will listen for changes and apply
     * animations.
     *
     * Disable this if you want to temporarily control the DOM-animations yourself.
     * Defaults to `true`.
     *
     * @type Boolean
     */
    get active() {
        return this._active;
    }

    set active(val: boolean) {
        this._active = val;
        this._updateListeners();
    }

    /**
     * The name of the attribute to use as model ID.
     *
     * Defaults to `data-flip-id`.
     *
     * @type String
     */
    get attrName() {
        return this._attrName;
    }

    set attrName(val: string) {
        this._attrName = val;
        this._updateListeners();
    }

    /**
     * Backing field for `active`.
     */
    private _active: boolean = true;

    /**
     * Backing field for `attrName`.
     */
    private _attrName: string = 'data-flip-id';

    /**
     * Whether a dom change event handler is enqueued for the current animation frame.
     */
    private _animationEnqueued: boolean = false;

    /**
     * The last known client rects of the children keyed by their ID.
     */
    private _childData: Map<string, [HTMLElement, ChildData]> = new Map();

    /**
     * The mutation observer listening for changes to the attributes of the child elements.
     */
    private _childObserver: MutationObserver;

    /**
     * The shadow slot containing the children.
     */
    private _slot: HTMLSlotElement;

    /**
     * The bound event handler for mutation observer updating.
     */
    private _mutationObserverUpdateHandler;

    constructor() {
        super();

        this._childObserver = new MutationObserver(() => this._enqueueAnimateChangedElements());
        this._mutationObserverUpdateHandler = () => this._updateMutationObserver();
    }

    connectedCallback() {
        if (window.ShadyCSS) {
            window.ShadyCSS.styleElement(this);
        }

        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }
        this.shadowRoot!.appendChild(template.content.cloneNode(true));

        this._slot = this.shadowRoot!.querySelector('slot') as HTMLSlotElement;
        this._updateListeners();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        switch (name) {
            case AttributeNames.Active:
                this.active = newValue != null;
                break;
            case AttributeNames.AttrName:
                this.attrName = newValue;
                break;
        }
    }

    /**
     * Animates the transition of the elements that have moved.
     */
    private _animateChangedElements() {
        const newChildData = this._collectChildData();

        for (const [id, [el, n]] of newChildData.entries()) {
            const oldChildData = this._childData.get(id);
            if (!oldChildData) {
                continue;
            }

            const [_, old] = oldChildData;
            const dT = old.top - n.top;
            const dL = old.left - n.left;

            // Animate only if there have been changes
            if (isCloseTo(dT, 0) &&
                isCloseTo(dL, 0) &&
                isCloseTo(old.scaleX / n.scaleX, 1) &&
                isCloseTo(old.scaleY / n.scaleY, 1)) {
                continue;
            }

            // Revert new layout into old positions
            el.style.opacity = String(old.opacity);
            el.style.transform = generateTransformString(dL, dT, old.scaleX, old.scaleY);

            requestAnimationFrame(() => {
                // Remove our reverts and let animation play
                el.style.opacity = String(n.opacity);
                el.style.transform = generateTransformString(0, 0, n.scaleX, n.scaleY);
            });
        }

        this._childData = newChildData;
    }

    /**
     * Goes through the node's children and collects styling metadata in a map.
     *
     * @returns A map with styling data by child ID.
     */
    private _collectChildData(): Map<string, [HTMLElement, ChildData]> {
        const bbox = this.getBoundingClientRect();
        const map = new Map<string, [HTMLElement, ChildData]>();

        for (const el of this._slot.assignedNodes()) {
            if (!(el instanceof HTMLElement)) {
                continue;
            }

            const id = el.getAttribute(this.attrName);
            if (!id) {
                continue;
            }

            const elemBox = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            let scaleX = '1.0';
            let scaleY = '1.0';
            const matches = styles.transform!.match(transformRegex);
            if (matches) {
                [, scaleX, scaleY] = matches;
            }

            const data = {
                top: elemBox.top - bbox.top,
                left: elemBox.left - bbox.left,
                opacity: Number.parseFloat(styles.opacity || '1'),
                scaleX: Number.parseFloat(scaleX),
                scaleY: Number.parseFloat(scaleY),
            };

            map.set(id, [el, data]);
        }

        return map;
    }

    /**
     * Enqueues the animation of moved elements at animation frame timing.
     */
    private _enqueueAnimateChangedElements() {
        if (this._animationEnqueued) {
            return;
        }

        this._animationEnqueued = true;

        batchCallback(() => {
            this._animationEnqueued = false;
            this._animateChangedElements();
        });
    }

    /**
     * Updates the registered event handlers, mutation observers and triggers animation..
     */
    private _updateListeners() {
        this.removeEventListener('dom-change', this._mutationObserverUpdateHandler);
        this._slot.removeEventListener('slotchange', this._mutationObserverUpdateHandler);
        if (this.active) {
            this.addEventListener('dom-change', this._mutationObserverUpdateHandler);
            this._slot.addEventListener('slotchange', this._mutationObserverUpdateHandler);
        }

        this._updateMutationObserver();
    }

    /**
     * Updates the mutation observer configuration and collects child position data,
     * if necessary.
     */
    private _updateMutationObserver() {
        this._childObserver.disconnect();

        if (!this.active) {
            return;
        }

        this._slot.assignedNodes()
            .filter(el => el instanceof HTMLElement)
            .forEach(child => this._childObserver.observe(child, {
                attributes: true,
                attributeFilter: [this.attrName],
            }));

        this._enqueueAnimateChangedElements();
    }
}
