/**
 * Copyright (c) 2012 Marcel Klehr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
window.trl8 = (function(window, document, undefined) {
  var consoleLog = console? console.log : function() {}
    , consoleWarn = console? console.warn : function() {}
    
  /**
   * MicroEvent - to make any js object an event emitter (server or browser)
   */

  var MicroEvent	= function(){}
  MicroEvent.prototype	= {
    bind	: function(event, fct){
      this._events = this._events || {};
      this._events[event] = this._events[event]	|| [];
      this._events[event].push(fct);
    },
    unbind	: function(event, fct){
      this._events = this._events || {};
      if( event in this._events === false  )	return;
      this._events[event].splice(this._events[event].indexOf(fct), 1);
    },
    trigger	: function(event /* , args... */){
      this._events = this._events || {};
      if( event in this._events === false  )	return;
      for(var i = 0; i < this._events[event].length; i++){
        this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1))
      }
    }
  };
  /**
   * mixin will delegate all MicroEvent.js function in the destination object
   * @param {Object} the object which will support MicroEvent
   */
  MicroEvent.mixin	= function(destObject){
    var props	= ['bind', 'unbind', 'trigger'];
    for(var i = 0; i < props.length; i ++){
      destObject.prototype[props[i]]	= MicroEvent.prototype[props[i]];
    }
  }
  
  /**
   * Loader
   * The loader is responsible for loading
   * and caching all necessary resources
   */
  function Loader(resources) {
    this.resources = resources
    this.cache = {} // file => contents
    this.langs = {} // lang => strings
  }
  
  Loader.prototype.load = function(lang, cb) {
    if(this.langs[lang]) return cb()

    if (this.resources.length > 0) {
      var reqs = 0;
      for (var i=0, n=this.resources.length; i < n; i++) {
        this.fetch(this.resources[i], lang, function(e) {
          reqs++;
          if(e) setTimeout(function(){ throw e }, 0)
          
          if (reqs < n) return;// Call back once all reqs are completed
          cb()
        })
      }
    }
  }
  
  Loader.prototype.fetch = function(href, lang, cb) {
    var that = this
    
    if (this.cache[href]) {
      this.parse(this.cache[href])
      cb()
      return;
    }
    
    var xhr = new XMLHttpRequest()
    xhr.open('GET', href, /*async: */true)
    if (xhr.overrideMimeType) {
      xhr.overrideMimeType('application/json; charset=utf-8');
    }
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status === 0) {
          var data = JSON.parse(xhr.responseText)
          that.cache[href] = data
          // Pass on the contents for parsing
          this.parse(lang, data, cb)
        } else {
          cb(new Error('Failed to load '+href))
        }
      }
    };
    xhr.send(null);
  }
  
  Loader.prototype.parse = function(lang, data, cb) {
    if ('object' != typeof data) {
      cb(new Error('A file couldn\'t be parsed as json.'))
      return
    }
    
    if (!data[lang]) {
      cb(new Error('Couldn\'t find translations for '+lang))
      return
    }
    
    if ('string' == typeof data[lang]) {
      // Import rule
      this.fetch(data[lang], lang, cb)
      return
    }
    
    if ('object' != typeof data[lang]) {
      cb(new Error('Translations should be specified as JSON objects!'))
      return
    }
    
    this.langs[lang] = data[lang]
    // TODO: Also store accompanying langs
    cb()
  }
  
  
  /**
   * The trl8 object
   */
  var trl8 =
  { language: null
  }
  MicroEvent.mixin(trl8)
  
  /**
   * Localize a document
   * @param langs An array of lang codes defining fallbacks
   */
  trl8.localize = function(langs) {
    // if only one string => create an array
    if ('string' == typeof langs) langs = [langs]
    
    this.build(langs, function(er, translations) {
      trl8.translateElement(translations)
    })
  }

  /**
   * Triggers the translation process
   * for an element
   * @param translations A hash of all translation strings
   * @param element A DOM element, if omitted, the document element will be used
   */
  trl8.translateElement = function(translations, element) {
    element = element || document.documentElement

    var children = element? getTranslatableChildren(element) : document.childNodes;
    for (var i=0, n=children.length; i < n; i++) {
      translateNode(translations, children[i])
    }

    // translate element itself if necessary
    translateNode(translations, element)
  }
  
    function asyncForEach(list, iterator, cb) {
    var i = 0
      , n = list.length
    iterator(list[i], i, function each(err) {
      consoleLog(err)
      i++
      if (i < n) return iterator(list[i],i, each);
      cb()
    })
  }
  
  function getTranslatableChildren(element) {
    if(!document.querySelectorAll) {
      if (!element) return []
      var nodes = element.getElementsByTagName('*')
        , l10nElements = []
      for (var i=0, n=nodes.length; i < n; i++) {
        if (nodes[i].getAttribute('data-l10n-id'))
          l10nElements.push(nodes[i]);
      }
      return l10nElements
    }
    return element.querySelectorAll('*[data-l10n-id]')
  }
  
  /**
   * Applies translations to a DOM node (recursive)
   */
  trl8.translateNode = function(translations, node) {
    var str = {}

    // get id
    str.id = node.getAttribute('data-l10n-id')
    if (!str.id) return
    if(!translations[str.id]) return

    // get args
    if(window.JSON) {
      str.args = JSON.parse(node.getAttribute('data-l10n-args'))
    }else{
      try{
        str.args = eval(node.getAttribute('data-l10n-args'))
      }catch(e) {
        consoleWarn('Couldn\'t parse args for '+str.id)
      }
    }
    
    // apply args
    str.str = substArguments(translations[str.id], str.args)

    var prop
      , index = str.id.lastIndexOf('.')
      , attrList = // allowed attributes
      { "title": 1
      , "innerHTML": 1
      , "alt": 1
      , "textContent": 1
      }
    // get attribute name to apply str to
    if (index > 0 && str.id.substr(index + 1) in attrList) { // an attribute has been specified
      prop = str.id.substr(index + 1)
    } else { // no attribute: assuming text content by default
      prop = document.body.textContent ? 'textContent' : 'innerText'
    }

    // Apply translation
    if (node.children.length === 0) {
      node[prop] = str.str
    } else {
      var children = element.childNodes,
          found = false
      for (var i=0, n=children.length; i < n; i++) {
        if (children[i].nodeType === 3 && /\S/.test(children[i].textContent)) {
          if (!found) {
            children[i].nodeValue = str.str
            found = true
          } else {
            children[i].nodeValue = ''
          }
        }
      }
      if (!found) {
        consoleWarn('Unexpected error: could not translate element content')
      }
    }


    // replace {{arguments}} with their values or the
    // associated translation string (based on its key)
    function substArguments(str, args) {
      var reArgs = /\{\{\s*([a-zA-Z\.]+)\s*\}\}/
        , match
      
      while (match = reArgs.exec(str)) {
        if (!match || match.length < 2)
          return str // argument key not found

        var arg = match[1]
          , sub = ''
        if (arg in args) {
          sub = args[arg]
        } else if (arg in translations) {
          sub = translations[arg]
        } else {
          consoleWarn('Could not find argument {{' + arg + '}}')
          return str
        }

        str = str.substring(0, match.index) + sub + str.substr(match.index + match[0].length)
      }
      
      return str
    }
  }
  
  /**
   * Builds a translation object from a list of langs (loads the necessary translations)
   * @param langs Array - a list of langs sorted by priority (default langs should go last)
   */
  trl8.build = function(langs, cb) {
    var build = {}

    asyncForEach(langs, function (lang, i, next) {
      trl8.loader.load(lang, next)
    }, function() {
    
      langs.reverse()
      for (var i=0, n=langs.length; i < n; i++) {
        // apply all strings of the current lang in the list
        // to our build object
        for (var string in this.loader.langs[lang]) {
          build[string] = this.loader.langs[lang][string]
        }
      }
      cb(null, build)
    })
  }
  
  /**
   * Index all <link>s
   */
  trl8.index = function () {
    // Find all <link>s
    var links = document.getElementsByTagName('link')
    for (var i=0, n=links.length; i < n; i++) {
      if (links[i].type != 'application/l10n+json')
        continue;
      resources.push(links[i].href)
    }
    this.loader = new Loader(resources)
    this.trigger('indexed')
  }
  
  
  if (document.addEventListener) // modern browsers and IE9+
   document.addEventListener('DOMContentLoaded', trl8.index, false)
  else if (window.attachEvent)
    document.attachEvent('onload', trl8.index, false)

})(window, document)