# \<dom-flip\>
[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/Festify/dom-flip)

🔀 Animate all the lists! FLIP move for Web Components!

## Installation
This element lives on npm. Install with `yarn add dom-flip` or `npm install --save dom-flip`.

## Usage
You can use this element together with any templatizing element that either modifies the DOM directly, or fires `dom-changed`-events, just like `<dom-repeat>` does.

To be able to correlate changes in the model to changes to the DOM, this element requires that you set an attribute on the child elements that is based on their model.

```html
<dom-flip>
    <template is="dom-repeat" items="[[items]]">
        <my-item data-flip-id$="[[item.id]]">[[item.name]]</my-item>
    </template>
</dom-flip>
```

Although we wish it did, this element will not work with `<iron-list>` due to the virtualization. Maybe this can be fixed in the future.

## License
MIT