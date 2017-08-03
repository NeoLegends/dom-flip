# \<dom-flip\>
🔀 FLIP move for Polymer v2!

## Installation
This element lives on bower. Install with `bower install --save dom-flip`.

## Usage
You can use this element together with any templatizing element that either modifies the DOM directly, or fires `dom-changed`-events, just like `<dom-repeat>` does.

To be able to correlate changes in the model to changes to the DOM, this element requires that you set an attribute on the child elements that is based on their model. 

```html
<link rel="import" href="bower_components/dom-flip/dom-flip.html">
 
<dom-flip>
    <template is="dom-repeat" items="[[items]]">
        <my-item data-flip-id$="[[item.id]]">[[item.name]]</my-item>
    </template>
</dom-flip>
```

Although we wish it did, this element will not work with `<iron-list>` due to the virtualization.