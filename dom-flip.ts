import { html, render, TemplateResult } from 'lit-html';

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
 * Determines whether a `Node` actually is an `HTMLElement` by looking for
 * the `Element.getAttribute`-function.
 *
 * @param x The dom Node to check.
 */
const isElement = (x: Node): x is HTMLElement => (x as HTMLElement).style instanceof CSSStyleDeclaration;

/**
 * The regex used to parse the transform matrix string.
 */
const transformRegex = /matrix\((-?\d*\.?\d+),\s*0,\s*0,\s*(-?\d*\.?\d+),\s*0,\s*0\)/;

/**
 * Generates a CSS `translate`-rule compatible string that does a 2D transform.
 *
 * @param {Number} dx the X delta
 * @param {Number} dy the Y delta
 * @param {Number} sx the X scale
 * @param {Number} sy the Y scale
 * @return {string} the CSS rule
 */
function generateTransformString(
    dx: number, dy: number,
    sx: number, sy: number,
): string {
   return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

/**
 * `dom-flip`
 *
 * FLIP move animations for web components.
 *
 * @demo demo/index.html
 * @see https://aerotwist.com/blog/flip-your-animations/
 */
export default class DomFlip extends HTMLElement {
    static get observedAttributes(): string[] {
        return [
            'active',
            'attr-name',
            'class-name',
            'delay-ms',
            'duration-ms',
            'easing',
        ];
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
    active: boolean = true;

    /**
     * The name of the attribute to use as model ID.
     *
     * Defaults to `data-flip-id`.
     *
     * @type String
     */
    attrName: string = 'data-flip-id';

    /**
     * The class name to apply when the elements are moving. This
     * only need be changed in case of conflicts.
     *
     * Defaults to `transitioning`.
     *
     * @type String
     */
    className: string = 'transitioning';

    /**
     * The CSS animation delay in milliseconds.
     *
     * Defaults to 0ms.
     *
     * @type Number
     */
    delayMs: number = 0;

    /**
     * The CSS animation duration in milliseconds.
     *
     * Defaults to 200ms.
     *
     * @type Number
     */
    durationMs: number = 200;

    /**
     * The CSS animation easing mode to use.
     *
     * Defaults to `ease-in-out`.
     *
     * @type String
     */
    easing: string = 'ease-in-out';

    /**
     * The last known client rects of the children keyed by their ID.
     */
    private _childData: Map<string, [HTMLElement, ChildData]> = new Map();

    /**
     * Whether a dom change event handler is enqueued for the current animation frame.
     */
    private _domChangeHandlerEnqueued: boolean = false;

    /**
     * Whether a lit render is enqueued for the current microtask.
     */
    private _renderEnqueued: boolean = false;

    /**
     * The shadow slot containing the children.
     */
    private _slot: HTMLSlotElement;

    /**
     * The bound event handler for the slotchange event.
     */
    private _slotHandler;

    constructor() {
        super();

        this._slotHandler = () => this._enqueueHandleDomChange();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this._render();

        this._slot = this.shadowRoot!.querySelector('slot') as HTMLSlotElement;
        this._updateEventHandler();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        switch (name) {
            case 'active':
                this.active = !!newValue;
                this._updateEventHandler();
                break;
            case 'attr-name':
                this.attrName = newValue;
                break;
            case 'class-name':
                this.className = newValue;
                break;
            case 'delay-ms':
                this.delayMs = Number(newValue);
                break;
            case 'duration-ms':
                this.durationMs = Number(newValue);
                break;
            case 'easing':
                this.easing = newValue;
                break;
        }

        this._enqueueRender();
    }

    /* Business logic */

    /**
     * Goes through the node's children and collects styling metadata in a map.
     *
     * @returns A map with styling data by child ID.
     */
    private _collectChildData(): Map<string, [HTMLElement, ChildData]> {
        const bbox = this.getBoundingClientRect();
        const map = new Map();

        for (const el of this._slot.assignedNodes()) {
            if (!isElement(el)) {
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
     * Updates the positions of the elements that have moved.
     */
    private _handleDomChange() {
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
            if (dT === 0 && dL === 0 &&
                (old.scaleX / n.scaleX) === 1.0 &&
                (old.scaleY / n.scaleY) === 1.0) {
                continue;
            }

            el.classList.remove(this.className);

            el.style.opacity = String(old.opacity);
            el.style.transform = generateTransformString(dL, dT, old.scaleX, old.scaleY);

            requestAnimationFrame(() => {
                el.classList.add(this.className);

                el.style.opacity = String(n.opacity);
                el.style.transform = generateTransformString(0, 0, n.scaleX, n.scaleY);

                setTimeout(
                    () => el.classList.remove(this.className),
                    this.durationMs,
                );
            });
        }

        this._childData = newChildData;
    }

    /* Utility methods */

    private _enqueueHandleDomChange() {
        if (this._domChangeHandlerEnqueued) {
            return;
        }

        this._domChangeHandlerEnqueued = true;
        requestAnimationFrame(() => {
            this._domChangeHandlerEnqueued = false;
            this._handleDomChange();
        });
    }

    private _enqueueRender() {
        if (this._renderEnqueued) {
            return;
        }

        this._renderEnqueued = true;
        Promise.resolve().then(() => {
            this._render();
            this._renderEnqueued = false;
        });
    }

    private _render() {
        const result = html`
            <style>
                ::slotted(.${this.className}) {
                    transition: transform ${this.durationMs}ms ${this.easing} ${this.delayMs}ms,
                                opacity ${this.durationMs}ms ${this.easing} ${this.delayMs}ms;
                }
            </style>

            <slot></slot>
        `;

        render(result, this.shadowRoot!);
    }

    private _updateEventHandler() {
        this._slot.removeEventListener('slotchange', this._slotHandler);

        if (this.active) {
            this._slot.addEventListener('slotchange', this._slotHandler);
        }
    }
}

customElements.define('dom-flip', DomFlip);
