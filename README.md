# client-side, cross-browser l10n for modern web applications

Unlike other i18n/l10n libraries, html10n.js supports:

* declarative localization: elements with `l10n-*` attributes are automatically translated when the document is loaded
* named variables instead of printf-like `%s` tokens
* a simple and full-featured pluralization system

Thanks to @fabi1cazenave for his original work on [webL10n](https://github.com/fabi1cazenave/webL10n/wiki) on which this project is based. Instead of featuring some weird `*.ini`/`*.properties`/`*.lol` format, this project expects translations to be provided in JSON for easier handling in JavaScript and better client-side performance.

## Example

Here’s a quick way to get a multilingual HTML page:

```html
<html>
<head>
  <script type="text/javascript" src="l10n.js"></script>
  <link rel="localizations" href="i18n.json" type="application/l10n+json"/>
</head>
<body>
  <button data-l10n-id="test" title="click me!">This is a test</button>
</body>
</html>
```

* l10n resource files are associated to the HTML document with a ``<link>`` element
* translatable elements carry a ``data-l10n-id`` attribute
* l10n resources are stored in a bullet-proof ``*.json`` file:

```json
{
"en": {
  "test": "This is a test",
  "test.title": "click me!"
},
"fr": {
  "test": "Ceci est un test",
  "test.title": "cliquez-moi!"
}
}
```


# JavaScript API

`html10n.js` exposes a rather simple `html10n` object.

* `localized` event: fired when the page has been translated;
* `localize`set the ISO-639-1 code of the current locale and start translating the document;
* `get` method: get a translated string.

```javascript
html10n.localize('fr')
html10n.on('localized', function() {
  console.log('Localized!')
});
```

```javascript
var message = html10n.get('test');
alert(message);
```

You will probably use the gettext-like alias:

```javascript
alert(_('test'));
```

To handle complex strings, the `get()` method can accept optional arguments:

```javascript
alert(_('welcome', { user: "John" }));
```

where `welcome` is defined like this:

```json
{
"en": {
  "welcome": "welcome, {{user}}!"
},
"fr": {
  "welcome": "bienvenue, {{user}} !"
}
}
```

### l10n arguments

You can specify a default value in JSON for any argument in the HTML document with the `data-l10n-args` attribute. In the last example, that would be:

```html
<p data-l10n-id="welcome" data-l10n-args='{ "user": "your awesomeness" }'>Welcome!</p>
```

### include rules

If you don’t want to have all your locales in a single file, simply use an include rule in your locale files to include another language:

```js
{ "en": {
// ...
},
"fr": "/locales/fr.json",
"nl": "/locales/nl.json"
}
```

### Pluralization

The following string might be gramatically incorrect when `n` equals zero or one:

```
"unread": "You have {{n}} unread messages"
```

This can be solved by using the pre-defined `plural()` macro:

```json
{
"en": {
 "unreadMessages": "You have {{n}} unread {[ plural(n) one: message, other: messages ]}"
}
}
```

Here, `plural()` is a macro taking a selector param based on which it picks on of the provided options.

`plural()` chooses between `zero | one | two | few | many | other`, depending on the param (`n`) and the current language, as specified in the Unicode rules. If one of these indexes isn’t specified,  `other` will be used in this case.


### Macros
Macros are defined in `html10n.macros` as functions taking the following arguments: `(key, translations, param, opts)`, where

 * `key` (String) is the key of the current message
 * `translations` (Object) is a hash of all messages by key
 * `param` (String) is the value of the argument, passed as the macro parameter
 * `opts` (Object) is a hash of options that may be used to produce the output (s. `plural()` macro above)

All macros should return a string that will replace the macro in the message.

### Changing DOM attributes
By default, we currently assume that all strings are applied to  the `textContent` DOM node property.
However, you can modify other properties of the appropriate DOM node by appending the property name like so:

```ini
welcome.innerHTML = welcome, <strong>{{user}}</strong>!
```


# Browser support
Should work with Firefox, Chrome, Opera and Internet Explorer 6 to 10.


# License
MIT license.