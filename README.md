# \<dom-flip\>

[![Build Status](https://travis-ci.org/NeoLegends/dom-flip.svg?branch=master)](https://travis-ci.org/NeoLegends/dom-flip)
[![Greenkeeper badge](https://badges.greenkeeper.io/Festify/dom-flip.svg)](https://greenkeeper.io/)
[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/Festify/dom-flip)

🔀 Smooth position animation for web components.

This element is an implementation of the [FLIP-technique](https://aerotwist.com/blog/flip-your-animations/) for arbitrary elements. Simply place it around the elements you indend to reorder and they will smoothly slide over the screen when moved.

<p align="center">
    <img src="https://user-images.githubusercontent.com/1683034/36944873-d6e8d81e-1fa4-11e8-9253-b1993cdcc794.gif">
</p>

## Installation
This element lives on npm. Install with `yarn add dom-flip` or `npm install --save dom-flip`.

## Usage
You can use this element together with any element that modifies the DOM. The animated elements must be direct children of the `dom-flip` element.

To be able to correlate changes in the model to changes to the DOM, this element requires that you give every element a unique ID. This must be an attribute on the element itself and cannot be a property (because properties cannot be observed via MutationObserver).

### Polymer's dom-repeat:
```html
<dom-flip>
    <!--
        If you change the order of the elements inside items, the elements will
        smoothly glide to their new place.
    -->
    <dom-repeat items="[[items]]">
        <template>
            <my-item data-flip-id$="[[item.id]]">[[item.name]]</my-item>
        </template
    </dom-repeat>
</dom-flip>
```

### lit-html:
```ts
const template = (items: { id: string, name: string }[]) => html`
    <dom-flip>
        ${items.map(item => html`<div data-flip-id="${item.id}">${item.name}</div>`)}
    </dom-flip>
`;

// Render some items
const result = template([
    { id: "1", name: "Hello" },
    { id: "2", name: ", " },
    { id: "3", name: "World!" }
]);
render(result, renderNode);

// ... next animation frame

// Change their order
const result = template([
    { id: "1", name: "Hello" },
    { id: "3", name: "World!" },
    { id: "2", name: ", " }
]);

// Positions are animated and the items will smoothly glide to their new place
render(result, renderNode);
```

### iron-list
Although we wish it did, this element will not work with `<iron-list>` due to the virtualization. Maybe this can be fixed in the future.

### Automatic registration
You can import the custom element class from `dom-flip/element` if you don't want it to automatically be registered within the custom elements registry.

## Performance
The element is designed to avoid layout thrashing as much as possible by batching work into microtasks and to animation frame timing.

## License
MIT
