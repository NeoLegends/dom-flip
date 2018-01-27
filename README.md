# \<dom-flip\>
[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/Festify/dom-flip)

🔀 Smooth list animation for web components.

This element is an implementation of the [FLIP-technique](https://aerotwist.com/blog/flip-your-animations/) for arbitrary elements. Simply place it around the elements you indend to move and they will smoothly slide over the screen.

## Installation
This element lives on npm. Install with `yarn add dom-flip` or `npm install --save dom-flip`.

## Usage
You can use this element together with any templatizing element that modifies the DOM. The animated elements must be direct children of the `dom-flip` element.

To be able to correlate changes in the model to changes to the DOM, this element requires that you give every element a unique ID. This can be either an attribute, or a property.

```html
<dom-flip>
    <template is="dom-repeat" items="[[items]]">
        <my-item data-flip-id$="[[item.id]]">[[item.name]]</my-item>
    </template>
</dom-flip>
```

## Usage with Polymer
It is also special-cased to work with Polymer's `dom-repeat`. Although we wish it did, this element will not work with `<iron-list>` due to the virtualization. Maybe this can be fixed in the future.

## License
MIT