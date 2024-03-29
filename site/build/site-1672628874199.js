(function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function compute_slots(slots) {
        const result = {};
        for (const key in slots) {
            result[key] = true;
        }
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function append_styles(target, style_sheet_id, styles) {
        const append_styles_to = get_root_for_style(target);
        if (!append_styles_to.getElementById(style_sheet_id)) {
            const style = element('style');
            style.id = style_sheet_id;
            style.textContent = styles;
            append_stylesheet(append_styles_to, style);
        }
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                else
                    this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }
    function construct_svelte_component(component, props) {
        return new component(props);
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash$1(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash$1(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    /**
     * Associates an arbitrary `context` object with the current component and the specified `key`
     * and returns that object. The context is then available to children of the component
     * (including slotted content) with `getContext`.
     *
     * Like lifecycle functions, this must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-setcontext
     */
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    /**
     * Retrieves the context that belongs to the closest parent component with the specified `key`.
     * Must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-getcontext
     */
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        const options = { direction: 'both' };
        let config = fn(node, params, options);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config(options);
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback, value) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            if (value === undefined) {
                callback(component.$$.ctx[index]);
            }
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* core\portal.svelte generated by Svelte v3.55.0 */

    function create_fragment$1J(ctx) {
    	let portal_root;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			portal_root = element("portal-root");
    		},
    		m(target, anchor) {
    			insert(target, portal_root, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(initPortal.call(null, portal_root));
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(portal_root);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    let portalRoot = null;
    const initPortal = node => portalRoot = node;

    const portal = node => {
    	portalRoot.appendChild(node);
    };

    class Portal$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1J, safe_not_equal, {});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* core\modal.svelte generated by Svelte v3.55.0 */

    function add_css$E(target) {
    	append_styles(target, "svelte-j8av7w", "modal-wrapper.svelte-j8av7w{position:fixed;top:0px;left:0px;width:100%;height:100%;background-color:rgba(0, 0, 0, 0.35);z-index:500;overflow:hidden}modal-wrapper.clear.svelte-j8av7w{background-color:transparent}div.svelte-j8av7w{overflow:hidden}");
    }

    function create_fragment$1I(ctx) {
    	let modal_wrapper;
    	let div;
    	let modal_wrapper_transition;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			modal_wrapper = element("modal-wrapper");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "svelte-j8av7w");
    			set_custom_element_data(modal_wrapper, "class", "svelte-j8av7w");
    			toggle_class(modal_wrapper, "clear", /*clear*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, modal_wrapper, anchor);
    			append(modal_wrapper, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div, "click", stop_propagation(/*click_handler*/ ctx[6])),
    					action_destroyer(portal.call(null, modal_wrapper)),
    					listen(modal_wrapper, "click", /*close*/ ctx[2])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*clear*/ 1) {
    				toggle_class(modal_wrapper, "clear", /*clear*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, /*anim*/ ctx[1], true);
    				modal_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, /*anim*/ ctx[1], false);
    			modal_wrapper_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(modal_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && modal_wrapper_transition) modal_wrapper_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { clear } = $$props;
    	let { persistent = false } = $$props;
    	const dispatch = createEventDispatcher();
    	const anim = { duration: 250 };

    	const close = evt => {
    		if (persistent === true) {
    			return;
    		}

    		dispatch("close");
    	};

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('clear' in $$props) $$invalidate(0, clear = $$props.clear);
    		if ('persistent' in $$props) $$invalidate(3, persistent = $$props.persistent);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [clear, anim, close, persistent, $$scope, slots, click_handler];
    }

    class Modal$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1k, create_fragment$1I, safe_not_equal, { clear: 0, persistent: 3 }, add_css$E);
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.55.0 */

    function add_css$D(target) {
    	append_styles(target, "svelte-1u7muvk", "drawer-wrapper.svelte-1u7muvk{position:absolute;top:0px;left:0px;height:100%;min-width:10vw;background-color:var(--card-background);overflow:hidden}");
    }

    // (57:0) {#if current !== null}
    function create_if_block$i(ctx) {
    	let modal;
    	let current;

    	modal = new Modal$1({
    			props: {
    				$$slots: { default: [create_default_slot$D] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler*/ ctx[3]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, current, props*/ 19) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (58:4) <Modal on:close={() => close(undefined)}>
    function create_default_slot$D(ctx) {
    	let drawer_wrapper;
    	let switch_instance;
    	let drawer_wrapper_transition;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[1]];
    	var switch_value = /*current*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    	}

    	return {
    		c() {
    			drawer_wrapper = element("drawer-wrapper");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			set_custom_element_data(drawer_wrapper, "class", "svelte-1u7muvk");
    		},
    		m(target, anchor) {
    			insert(target, drawer_wrapper, anchor);
    			if (switch_instance) mount_component(switch_instance, drawer_wrapper, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 2)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[1])])
    			: {};

    			if (switch_value !== (switch_value = /*current*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, drawer_wrapper, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			add_render_callback(() => {
    				if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, drawerSlide$1, {}, true);
    				drawer_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, drawerSlide$1, {}, false);
    			drawer_wrapper_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(drawer_wrapper);
    			if (switch_instance) destroy_component(switch_instance);
    			if (detaching && drawer_wrapper_transition) drawer_wrapper_transition.end();
    		}
    	};
    }

    function create_fragment$1H(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*current*/ ctx[0] !== null && create_if_block$i(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*current*/ ctx[0] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*current*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$i(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    const drawerSlide$1 = (node, options) => {
    	return {
    		delay: 0,
    		duration: 250,
    		css: (t, u) => `
                transform: translateX(-${u * 100}%);
                opacity: ${t};
            `
    	};
    };

    let show$1;
    const openDrawer = (...args) => show$1(...args);

    function instance$1j($$self, $$props, $$invalidate) {
    	let current = null;
    	let props = {};
    	let close = null;

    	show$1 = (component, opts) => new Promise(resolve => {
    			if (current !== null) {
    				resolve(null);
    				return;
    			}

    			$$invalidate(2, close = value => {
    				$$invalidate(0, current = null);
    				$$invalidate(1, props = {});
    				resolve(value);
    			});

    			$$invalidate(1, props = { ...opts, close });
    			$$invalidate(0, current = component);
    		});

    	const close_handler = () => close(undefined);
    	return [current, props, close, close_handler];
    }

    class Drawer$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1j, create_fragment$1H, safe_not_equal, {}, add_css$D);
    	}
    }

    /* core\dialog.svelte generated by Svelte v3.55.0 */

    function get_each_context$a(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i].component;
    	child_ctx[4] = list[i].modalClose;
    	child_ctx[5] = list[i].persistent;
    	child_ctx[6] = list[i].props;
    	return child_ctx;
    }

    // (45:4) <Modal {persistent} on:close={modalClose}>
    function create_default_slot$C(ctx) {
    	let switch_instance;
    	let t;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[6]];
    	var switch_value = /*component*/ ctx[3];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*dialogs*/ 1)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[6])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[3])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, t.parentNode, t);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (44:0) {#each dialogs as {component, modalClose, persistent, props}}
    function create_each_block$a(ctx) {
    	let modal;
    	let current;

    	modal = new Modal$1({
    			props: {
    				persistent: /*persistent*/ ctx[5],
    				$$slots: { default: [create_default_slot$C] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", function () {
    		if (is_function(/*modalClose*/ ctx[4])) /*modalClose*/ ctx[4].apply(this, arguments);
    	});

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const modal_changes = {};
    			if (dirty & /*dialogs*/ 1) modal_changes.persistent = /*persistent*/ ctx[5];

    			if (dirty & /*$$scope, dialogs*/ 513) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    function create_fragment$1G(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*dialogs*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$a(get_each_context$a(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*dialogs*/ 1) {
    				each_value = /*dialogs*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$a(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$a(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    let show;
    const showDialog = (...args) => show(...args);

    function instance$1i($$self, $$props, $$invalidate) {
    	let dialogs = [];

    	const add = dialog => {
    		$$invalidate(0, dialogs = [...dialogs, dialog]);
    	};

    	const remove = id => {
    		$$invalidate(0, dialogs = dialogs.filter(dialog => dialog.id !== id));
    	};

    	show = (component, opts) => new Promise(resolve => {
    			const id = `${Date.now()}:${Math.random().toString(16)}`;

    			const close = value => {
    				remove(id);
    				resolve(value);
    			};

    			const dialog = {
    				id,
    				component,
    				persistent: opts.persistent,
    				props: { ...opts, close },
    				modalClose: () => close(undefined)
    			};

    			add(dialog);
    		});

    	return [dialogs];
    }

    class Dialog$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1i, create_fragment$1G, safe_not_equal, {});
    	}
    }

    const setValues = (node, values) => {
        if (values.area !== undefined) {
            node.style.gridArea = values.area;
            return
        }
        node.style.gridColumn = values.col ?? "";
        node.style.gridRow = values.row ?? "";
    };

    var grid = (node, values) => {
        setValues(node, values);
        return {
            update: (newValues) => setValues(node, newValues)
        }
    };

    /* core\action-area.svelte generated by Svelte v3.55.0 */

    function add_css$C(target) {
    	append_styles(target, "svelte-xhf20k", "action-area.svelte-xhf20k{--ripple-color:var(--ripple-normal);display:grid;overflow:hidden;position:relative;cursor:pointer;border-radius:4px}action-area.svelte-xhf20k::after{position:absolute;content:\"\";width:100%;height:100%;transition:background-color 250ms linear;background-color:rgba(0, 0, 0, 0)}action-area.svelte-xhf20k:not(.disabled):active::after{transition:background-color 100ms linear;background-color:var(--ripple-color, var(--ripple-normal))}.square.svelte-xhf20k{border-radius:0px}");
    }

    function create_fragment$1F(ctx) {
    	let action_area;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			action_area = element("action-area");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(action_area, "class", "svelte-xhf20k");
    			toggle_class(action_area, "disabled", /*disabled*/ ctx[0]);
    			toggle_class(action_area, "square", /*square*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, action_area, anchor);

    			if (default_slot) {
    				default_slot.m(action_area, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(action_area, "click", /*click_handler*/ ctx[5]),
    					action_destroyer(grid_action = grid.call(null, action_area, /*$$props*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
    				}
    			}

    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 4) grid_action.update.call(null, /*$$props*/ ctx[2]);

    			if (!current || dirty & /*disabled*/ 1) {
    				toggle_class(action_area, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (!current || dirty & /*square*/ 2) {
    				toggle_class(action_area, "square", /*square*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(action_area);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { disabled } = $$props;
    	let { square } = $$props;

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('disabled' in $$new_props) $$invalidate(0, disabled = $$new_props.disabled);
    		if ('square' in $$new_props) $$invalidate(1, square = $$new_props.square);
    		if ('$$scope' in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);
    	return [disabled, square, $$props, $$scope, slots, click_handler];
    }

    class Action_area$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1h, create_fragment$1F, safe_not_equal, { disabled: 0, square: 1 }, add_css$C);
    	}
    }

    /* core\appbar.svelte generated by Svelte v3.55.0 */

    function add_css$B(target) {
    	append_styles(target, "svelte-cqgm45", "doric-app-bar.svelte-cqgm45{position:relative;grid-template-rows:56px min-content;background-color:var(--title-bar-background);display:grid;box-shadow:0px 2px 2px var(--shadow-color)}doric-app-bar.svelte-cqgm45>:not(.ignore-appbar-reskin),title-area.svelte-cqgm45>:not(.ignore-appbar-reskin){color:var(--title-bar-text);--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark);--control-border:var(--title-bar-text);--control-border-focus:var(--title-bar-text)}title-area.svelte-cqgm45{display:grid;grid-template-columns:max-content auto max-content;color:var(--title-bar-text)}title-text.svelte-cqgm45{font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}title-text.center.svelte-cqgm45{justify-content:center}");
    }

    const get_extension_slot_changes$1 = dirty => ({});
    const get_extension_slot_context$1 = ctx => ({});
    const get_action_slot_changes$2 = dirty => ({});
    const get_action_slot_context$2 = ctx => ({});
    const get_menu_slot_changes$1 = dirty => ({});
    const get_menu_slot_context$1 = ctx => ({});

    // (44:26)               
    function fallback_block_1$4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (50:28)               
    function fallback_block$5(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1E(ctx) {
    	let doric_app_bar;
    	let title_area;
    	let t0;
    	let title_text;
    	let t1;
    	let t2;
    	let current;
    	const menu_slot_template = /*#slots*/ ctx[2].menu;
    	const menu_slot = create_slot(menu_slot_template, ctx, /*$$scope*/ ctx[1], get_menu_slot_context$1);
    	const menu_slot_or_fallback = menu_slot || fallback_block_1$4();
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	const action_slot_template = /*#slots*/ ctx[2].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[1], get_action_slot_context$2);
    	const action_slot_or_fallback = action_slot || fallback_block$5();
    	const extension_slot_template = /*#slots*/ ctx[2].extension;
    	const extension_slot = create_slot(extension_slot_template, ctx, /*$$scope*/ ctx[1], get_extension_slot_context$1);

    	return {
    		c() {
    			doric_app_bar = element("doric-app-bar");
    			title_area = element("title-area");
    			if (menu_slot_or_fallback) menu_slot_or_fallback.c();
    			t0 = space();
    			title_text = element("title-text");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			if (action_slot_or_fallback) action_slot_or_fallback.c();
    			t2 = space();
    			if (extension_slot) extension_slot.c();
    			set_custom_element_data(title_text, "class", "svelte-cqgm45");
    			toggle_class(title_text, "center", /*center*/ ctx[0]);
    			set_custom_element_data(title_area, "class", "svelte-cqgm45");
    			set_custom_element_data(doric_app_bar, "class", "svelte-cqgm45");
    		},
    		m(target, anchor) {
    			insert(target, doric_app_bar, anchor);
    			append(doric_app_bar, title_area);

    			if (menu_slot_or_fallback) {
    				menu_slot_or_fallback.m(title_area, null);
    			}

    			append(title_area, t0);
    			append(title_area, title_text);

    			if (default_slot) {
    				default_slot.m(title_text, null);
    			}

    			append(title_area, t1);

    			if (action_slot_or_fallback) {
    				action_slot_or_fallback.m(title_area, null);
    			}

    			append(doric_app_bar, t2);

    			if (extension_slot) {
    				extension_slot.m(doric_app_bar, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (menu_slot) {
    				if (menu_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						menu_slot,
    						menu_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(menu_slot_template, /*$$scope*/ ctx[1], dirty, get_menu_slot_changes$1),
    						get_menu_slot_context$1
    					);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*center*/ 1) {
    				toggle_class(title_text, "center", /*center*/ ctx[0]);
    			}

    			if (action_slot) {
    				if (action_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						action_slot,
    						action_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(action_slot_template, /*$$scope*/ ctx[1], dirty, get_action_slot_changes$2),
    						get_action_slot_context$2
    					);
    				}
    			}

    			if (extension_slot) {
    				if (extension_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						extension_slot,
    						extension_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(extension_slot_template, /*$$scope*/ ctx[1], dirty, get_extension_slot_changes$1),
    						get_extension_slot_context$1
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(menu_slot_or_fallback, local);
    			transition_in(default_slot, local);
    			transition_in(action_slot_or_fallback, local);
    			transition_in(extension_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(menu_slot_or_fallback, local);
    			transition_out(default_slot, local);
    			transition_out(action_slot_or_fallback, local);
    			transition_out(extension_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_app_bar);
    			if (menu_slot_or_fallback) menu_slot_or_fallback.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (action_slot_or_fallback) action_slot_or_fallback.d(detaching);
    			if (extension_slot) extension_slot.d(detaching);
    		}
    	};
    }

    function instance$1g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { center } = $$props;

    	$$self.$$set = $$props => {
    		if ('center' in $$props) $$invalidate(0, center = $$props.center);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [center, $$scope, slots];
    }

    class Appbar$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1g, create_fragment$1E, safe_not_equal, { center: 0 }, add_css$B);
    	}
    }

    /* core\app-style.svelte generated by Svelte v3.55.0 */

    function create_fragment$1D(ctx) {
    	let switch_instance0;
    	let t0;
    	let switch_instance1;
    	let t1;
    	let portal;
    	let t2;
    	let dialog;
    	let t3;
    	let drawer;
    	let current;
    	var switch_value = /*theme*/ ctx[0];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance0 = construct_svelte_component(switch_value, switch_props());
    	}

    	var switch_value_1 = /*baseline*/ ctx[1];

    	function switch_props_1(ctx) {
    		return {};
    	}

    	if (switch_value_1) {
    		switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1());
    	}

    	portal = new Portal$1({});
    	dialog = new Dialog$1({});
    	drawer = new Drawer$1({});

    	return {
    		c() {
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t0 = space();
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			t1 = space();
    			create_component(portal.$$.fragment);
    			t2 = space();
    			create_component(dialog.$$.fragment);
    			t3 = space();
    			create_component(drawer.$$.fragment);
    		},
    		m(target, anchor) {
    			if (switch_instance0) mount_component(switch_instance0, target, anchor);
    			insert(target, t0, anchor);
    			if (switch_instance1) mount_component(switch_instance1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(portal, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(dialog, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(drawer, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (switch_value !== (switch_value = /*theme*/ ctx[0])) {
    				if (switch_instance0) {
    					group_outros();
    					const old_component = switch_instance0;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance0 = construct_svelte_component(switch_value, switch_props());
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, t0.parentNode, t0);
    				} else {
    					switch_instance0 = null;
    				}
    			}

    			if (switch_value_1 !== (switch_value_1 = /*baseline*/ ctx[1])) {
    				if (switch_instance1) {
    					group_outros();
    					const old_component = switch_instance1;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_1) {
    					switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1());
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, t1.parentNode, t1);
    				} else {
    					switch_instance1 = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
    			transition_in(portal.$$.fragment, local);
    			transition_in(dialog.$$.fragment, local);
    			transition_in(drawer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
    			transition_out(portal.$$.fragment, local);
    			transition_out(dialog.$$.fragment, local);
    			transition_out(drawer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance0) destroy_component(switch_instance0, detaching);
    			if (detaching) detach(t0);
    			if (switch_instance1) destroy_component(switch_instance1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(portal, detaching);
    			if (detaching) detach(t2);
    			destroy_component(dialog, detaching);
    			if (detaching) detach(t3);
    			destroy_component(drawer, detaching);
    		}
    	};
    }

    function instance$1f($$self, $$props, $$invalidate) {
    	let { theme = null } = $$props;
    	let { baseline = null } = $$props;

    	$$self.$$set = $$props => {
    		if ('theme' in $$props) $$invalidate(0, theme = $$props.theme);
    		if ('baseline' in $$props) $$invalidate(1, baseline = $$props.baseline);
    	};

    	return [theme, baseline];
    }

    class App_style$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1f, create_fragment$1D, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

    const calcValue = value => {
        if (Array.isArray(value) === false) {
            return value
        }
        if (value[0] === null || value[0] === undefined) {
            return null
        }
        return value.join("")
    };
    const udpateVars = (node, current, next) => {
        const keys = new Set([
            ...Object.keys(current),
            ...Object.keys(next),
        ]);
        for (const key of keys) {
            const varName = `--${key}`;
            const currentValue = calcValue(current[key]);
            const nextValue = calcValue(next[key]);
            if (nextValue === undefined || nextValue === null) {
                node.style.removeProperty(varName);
            }
            if (currentValue !== nextValue) {
                node.style.setProperty(varName, nextValue);
            }
        }
    };
    const vars = (node, vars) => {
        let currentVars = vars;
        udpateVars(node, {}, currentVars);
        return {
            update(newVars) {
                udpateVars(node, currentVars, newVars);
                currentVars = newVars;
            }
        }
    };

    /* core\avatar.svelte generated by Svelte v3.55.0 */

    function add_css$A(target) {
    	append_styles(target, "svelte-bg51jk", "avatar.svelte-bg51jk{display:inline-flex;background-image:var(--avatar-image);background-position:center center;background-size:var(--avatar-image-size);width:var(--avatar-size);height:var(--avatar-size);border-radius:50%;justify-content:center;align-items:center;background-color:var(--avatar-background, var(--button-default-fill));color:var(--avatar-text, var(--button-default-text));font-size:var(--text-size-header);user-select:none}");
    }

    function create_fragment$1C(ctx) {
    	let avatar;
    	let t;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			avatar = element("avatar");
    			t = text("​\r\n    ");
    			if (default_slot) default_slot.c();
    			attr(avatar, "class", "svelte-bg51jk");
    		},
    		m(target, anchor) {
    			insert(target, avatar, anchor);
    			append(avatar, t);

    			if (default_slot) {
    				default_slot.m(avatar, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, avatar, /*avatarVars*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[6],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
    						null
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*avatarVars*/ 1) vars_action.update.call(null, /*avatarVars*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(avatar);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1e($$self, $$props, $$invalidate) {
    	let avatarVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { size = "36px" } = $$props;
    	let { imageSize = "contain" } = $$props;
    	let { image } = $$props;
    	let { textColor } = $$props;
    	let { background } = $$props;

    	$$self.$$set = $$props => {
    		if ('size' in $$props) $$invalidate(1, size = $$props.size);
    		if ('imageSize' in $$props) $$invalidate(2, imageSize = $$props.imageSize);
    		if ('image' in $$props) $$invalidate(3, image = $$props.image);
    		if ('textColor' in $$props) $$invalidate(4, textColor = $$props.textColor);
    		if ('background' in $$props) $$invalidate(5, background = $$props.background);
    		if ('$$scope' in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size, image, imageSize, background, textColor*/ 62) {
    			$$invalidate(0, avatarVars = {
    				"avatar-size": size,
    				"avatar-image": image ? `url(${image})` : null,
    				"avatar-image-size": imageSize,
    				"avatar-background": background,
    				"avatar-text": textColor
    			});
    		}
    	};

    	return [avatarVars, size, imageSize, image, textColor, background, $$scope, slots];
    }

    class Avatar extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$1e,
    			create_fragment$1C,
    			safe_not_equal,
    			{
    				size: 1,
    				imageSize: 2,
    				image: 3,
    				textColor: 4,
    				background: 5
    			},
    			add_css$A
    		);
    	}
    }

    /* core\badge.svelte generated by Svelte v3.55.0 */

    function add_css$z(target) {
    	append_styles(target, "svelte-ht8min", "badge-wrapper.svelte-ht8min{position:relative;display:inline-grid}doric-badge.svelte-ht8min{display:flex;position:absolute;top:var(--anchor-top, 0px);left:var(--anchor-left, 100%);transform:translate(var(--translate-x, -50%), var(--translate-y, -50%));width:24px;height:24px;z-index:+10;align-items:center;justify-content:center;border-radius:12px;font-size:12px;font-weight:500}.primary.svelte-ht8min{background-color:var(--button-primary);color:var(--button-primary-text)}.secondary.svelte-ht8min{background-color:var(--button-secondary);color:var(--button-secondary-text)}.danger.svelte-ht8min{background-color:var(--button-danger);color:var(--button-danger-text)}");
    }

    const get_content_slot_changes$1 = dirty => ({});
    const get_content_slot_context$1 = ctx => ({});

    function create_fragment$1B(ctx) {
    	let badge_wrapper;
    	let t;
    	let doric_badge;
    	let doric_badge_class_value;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
    	const content_slot_template = /*#slots*/ ctx[6].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[5], get_content_slot_context$1);

    	return {
    		c() {
    			badge_wrapper = element("badge-wrapper");
    			if (default_slot) default_slot.c();
    			t = space();
    			doric_badge = element("doric-badge");
    			if (content_slot) content_slot.c();
    			set_custom_element_data(doric_badge, "class", doric_badge_class_value = "" + (null_to_empty(/*color*/ ctx[0]) + " svelte-ht8min"));
    			set_custom_element_data(badge_wrapper, "class", "svelte-ht8min");
    		},
    		m(target, anchor) {
    			insert(target, badge_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(badge_wrapper, null);
    			}

    			append(badge_wrapper, t);
    			append(badge_wrapper, doric_badge);

    			if (content_slot) {
    				content_slot.m(doric_badge, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, doric_badge, /*badgeVars*/ ctx[1])),
    					action_destroyer(grid_action = grid.call(null, badge_wrapper, /*$$props*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (content_slot) {
    				if (content_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						content_slot,
    						content_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(content_slot_template, /*$$scope*/ ctx[5], dirty, get_content_slot_changes$1),
    						get_content_slot_context$1
    					);
    				}
    			}

    			if (!current || dirty & /*color*/ 1 && doric_badge_class_value !== (doric_badge_class_value = "" + (null_to_empty(/*color*/ ctx[0]) + " svelte-ht8min"))) {
    				set_custom_element_data(doric_badge, "class", doric_badge_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*badgeVars*/ 2) vars_action.update.call(null, /*badgeVars*/ ctx[1]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 4) grid_action.update.call(null, /*$$props*/ ctx[2]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(content_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(content_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(badge_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (content_slot) content_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1d($$self, $$props, $$invalidate) {
    	let badgeVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { color = "primary" } = $$props;
    	let { anchor = {} } = $$props;
    	let { translate = {} } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('color' in $$new_props) $$invalidate(0, color = $$new_props.color);
    		if ('anchor' in $$new_props) $$invalidate(3, anchor = $$new_props.anchor);
    		if ('translate' in $$new_props) $$invalidate(4, translate = $$new_props.translate);
    		if ('$$scope' in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*anchor, translate*/ 24) {
    			$$invalidate(1, badgeVars = {
    				"anchor-top": anchor.top,
    				"anchor-left": anchor.left,
    				"translate-x": translate.x,
    				"translate-y": translate.y
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);
    	return [color, badgeVars, $$props, anchor, translate, $$scope, slots];
    }

    class Badge extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1d, create_fragment$1B, safe_not_equal, { color: 0, anchor: 3, translate: 4 }, add_css$z);
    	}
    }

    var nvalue = (value, defValue) => {
        if (value === null || value === undefined) {
            return defValue
        }
        return value
    };

    const css = (parts, ...values) => {
        const css = parts
            .reduce(
                (cssParts, part, index) => [
                    ...cssParts,
                    part,
                    nvalue(values[index], "")
                ],
                []
            )
            .join("");
        return `<style>\n${css}\n</style>`
    };

    /* core\baseline.svelte generated by Svelte v3.55.0 */

    function add_css$y(target) {
    	append_styles(target, "svelte-2svswe", "*{box-sizing:border-box;flex-shrink:0}html{margin:0px;padding:0px;width:100%;height:100%;overflow:hidden}body{position:fixed;margin:0px;padding:0px;width:100%;height:100%;overflow:hidden;touch-action:pan-x pan-y;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--layer-border-color);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert);--shadow-color:rgba(0, 0, 0, 0.25)}a, a:visited{color:var(--primary)}a:hover{color:var(--secondary)}");
    }

    function create_fragment$1A(ctx) {
    	let link0;
    	let link1;
    	let link2;
    	let t0;
    	let t1;
    	let html_tag;
    	let html_anchor;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			t0 = space();
    			t1 = space();
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			attr(link0, "href", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700");
    			attr(link0, "rel", "stylesheet");
    			attr(link0, "type", "text/css");
    			attr(link1, "href", "https://fonts.googleapis.com/css?family=Orbitron:300,400,500,700");
    			attr(link1, "rel", "stylesheet");
    			attr(link1, "type", "text/css");
    			attr(link2, "rel", "stylesheet");
    			attr(link2, "href", "https://ka-f.fontawesome.com/releases/v6.0.0/css/free.min.css?token=0011e611c6");
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			append(document.head, link0);
    			append(document.head, link1);
    			append(document.head, link2);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			html_tag.m(/*subPixelFix*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);

    			if (!mounted) {
    				dispose = listen(document.body, "touchstart", touchstart_handler);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			detach(link0);
    			detach(link1);
    			detach(link2);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const touchstart_handler = () => {
    	
    };

    function instance$1c($$self) {
    	const lastDigit = Math.ceil(screen.width * devicePixelRatio * 10) % 10;
    	const roundDown = lastDigit >= 5;

    	const subPixelFix = css`
        body {
            --sub-pixel-offset: ${roundDown ? 1 : 0}px;
        }
    `;

    	return [subPixelFix];
    }

    class Baseline$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1c, create_fragment$1A, safe_not_equal, {}, add_css$y);
    	}
    }

    const link = (target) => {
        const [url, type = ""] = target.split("|");
        const anchor = document.createElement("a");
        anchor.href = url;

        return (event) => {
            // console.log(event)

            if (event.ctrlKey === true) {
                anchor.target = "_blank";
                anchor.click();
                return
            }

            anchor.target = type;
            anchor.click();
        }
    };

    /* core\button.svelte generated by Svelte v3.55.0 */

    function add_css$x(target) {
    	append_styles(target, "svelte-1t6aucn", "doric-button.svelte-1t6aucn{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}doric-button.svelte-1t6aucn::after{position:absolute;content:\"\";width:100%;height:100%;transition:background-color 200ms linear;background-color:rgba(0, 0, 0, 0)}doric-button.svelte-1t6aucn:not(.disabled):active::after{transition:none;background-color:var(--ripple-color, var(--ripple-normal))}.round.svelte-1t6aucn{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.compact.svelte-1t6aucn{width:var(--button-round-size);padding:4px 8px}.adorn.svelte-1t6aucn{padding-top:2px;padding-bottom:2px;margin:4px}.control.svelte-1t6aucn{padding:0px}.disabled.svelte-1t6aucn{opacity:0.5}.primary.svelte-1t6aucn{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-1t6aucn{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-1t6aucn{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-1t6aucn{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--button-filled-text-color)}.outline.svelte-1t6aucn{border:1px solid var(--button-color);color:var(--button-color)}.square.svelte-1t6aucn{border-radius:0px}");
    }

    function create_fragment$1z(ctx) {
    	let doric_button;
    	let doric_button_class_value;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);

    	return {
    		c() {
    			doric_button = element("doric-button");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_button, "class", doric_button_class_value = "" + (/*color*/ ctx[1] + " " + /*variant*/ ctx[7] + " svelte-1t6aucn"));
    			toggle_class(doric_button, "adorn", /*adorn*/ ctx[0]);
    			toggle_class(doric_button, "compact", /*compact*/ ctx[2]);
    			toggle_class(doric_button, "control", /*control*/ ctx[3]);
    			toggle_class(doric_button, "disabled", /*disabled*/ ctx[4]);
    			toggle_class(doric_button, "round", /*round*/ ctx[5]);
    			toggle_class(doric_button, "square", /*square*/ ctx[6]);
    			toggle_class(doric_button, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    		},
    		m(target, anchor) {
    			insert(target, doric_button, anchor);

    			if (default_slot) {
    				default_slot.m(doric_button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(doric_button, "click", /*handleTap*/ ctx[9]),
    					action_destroyer(vars_action = vars.call(null, doric_button, /*buttonVars*/ ctx[8])),
    					action_destroyer(grid_action = grid.call(null, doric_button, /*$$props*/ ctx[10]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[13],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[13], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*color, variant*/ 130 && doric_button_class_value !== (doric_button_class_value = "" + (/*color*/ ctx[1] + " " + /*variant*/ ctx[7] + " svelte-1t6aucn"))) {
    				set_custom_element_data(doric_button, "class", doric_button_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 256) vars_action.update.call(null, /*buttonVars*/ ctx[8]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 1024) grid_action.update.call(null, /*$$props*/ ctx[10]);

    			if (!current || dirty & /*color, variant, adorn*/ 131) {
    				toggle_class(doric_button, "adorn", /*adorn*/ ctx[0]);
    			}

    			if (!current || dirty & /*color, variant, compact*/ 134) {
    				toggle_class(doric_button, "compact", /*compact*/ ctx[2]);
    			}

    			if (!current || dirty & /*color, variant, control*/ 138) {
    				toggle_class(doric_button, "control", /*control*/ ctx[3]);
    			}

    			if (!current || dirty & /*color, variant, disabled*/ 146) {
    				toggle_class(doric_button, "disabled", /*disabled*/ ctx[4]);
    			}

    			if (!current || dirty & /*color, variant, round*/ 162) {
    				toggle_class(doric_button, "round", /*round*/ ctx[5]);
    			}

    			if (!current || dirty & /*color, variant, square*/ 194) {
    				toggle_class(doric_button, "square", /*square*/ ctx[6]);
    			}

    			if (!current || dirty & /*color, variant, adorn*/ 131) {
    				toggle_class(doric_button, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1b($$self, $$props, $$invalidate) {
    	let openLink;
    	let buttonVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { adorn } = $$props;
    	let { buttonColor = null } = $$props;
    	let { color = "default" } = $$props;
    	let { compact } = $$props;
    	let { control = false } = $$props;
    	let { disabled = false } = $$props;
    	let { link: link$1 = null } = $$props;
    	let { round } = $$props;
    	let { square } = $$props;
    	let { variant = "normal" } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		if (openLink !== null) {
    			openLink(evt);
    			return;
    		}

    		dispatch("click", evt);
    	};

    	$$self.$$set = $$new_props => {
    		$$invalidate(10, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('adorn' in $$new_props) $$invalidate(0, adorn = $$new_props.adorn);
    		if ('buttonColor' in $$new_props) $$invalidate(11, buttonColor = $$new_props.buttonColor);
    		if ('color' in $$new_props) $$invalidate(1, color = $$new_props.color);
    		if ('compact' in $$new_props) $$invalidate(2, compact = $$new_props.compact);
    		if ('control' in $$new_props) $$invalidate(3, control = $$new_props.control);
    		if ('disabled' in $$new_props) $$invalidate(4, disabled = $$new_props.disabled);
    		if ('link' in $$new_props) $$invalidate(12, link$1 = $$new_props.link);
    		if ('round' in $$new_props) $$invalidate(5, round = $$new_props.round);
    		if ('square' in $$new_props) $$invalidate(6, square = $$new_props.square);
    		if ('variant' in $$new_props) $$invalidate(7, variant = $$new_props.variant);
    		if ('$$scope' in $$new_props) $$invalidate(13, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*link*/ 4096) {
    			openLink = link$1 === null ? null : link(link$1);
    		}

    		if ($$self.$$.dirty & /*round, buttonColor*/ 2080) {
    			$$invalidate(8, buttonVars = {
    				"button-round-size": round,
    				"button-color": buttonColor
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		adorn,
    		color,
    		compact,
    		control,
    		disabled,
    		round,
    		square,
    		variant,
    		buttonVars,
    		handleTap,
    		$$props,
    		buttonColor,
    		link$1,
    		$$scope,
    		slots
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$1b,
    			create_fragment$1z,
    			safe_not_equal,
    			{
    				adorn: 0,
    				buttonColor: 11,
    				color: 1,
    				compact: 2,
    				control: 3,
    				disabled: 4,
    				link: 12,
    				round: 5,
    				square: 6,
    				variant: 7
    			},
    			add_css$x
    		);
    	}
    }

    /* core\chip.svelte generated by Svelte v3.55.0 */

    function add_css$w(target) {
    	append_styles(target, "svelte-1jhvx0t", "doric-chip.svelte-1jhvx0t{position:relative;overflow:hidden;vertical-align:text-bottom;display:inline-grid;grid-template-columns:min-content auto min-content\r\n        ;border-radius:16px;height:30px;user-select:none;--fill-color:var(--button-default-fill);--text-normal:var(--text-invert);background-color:var(--fill-color);color:var(--text-invert);font-weight:500;font-size:var(--text-size-info)}doric-chip.clickable.svelte-1jhvx0t{cursor:pointer}doric-chip.clickable.svelte-1jhvx0t::after{position:absolute;content:\"\";width:100%;height:100%;transition:background-color 250ms linear;background-color:rgba(0, 0, 0, 0)}doric-chip.clickable.svelte-1jhvx0t:not(.disabled):active::after{transition:background-color 100ms linear;background-color:var(--ripple-color, var(--ripple-normal))}doric-chip.primary.svelte-1jhvx0t{--fill-color:var(--primary)}doric-chip.secondary.svelte-1jhvx0t{--fill-color:var(--secondary)}doric-chip.danger.svelte-1jhvx0t{--fill-color:var(--danger)}div.svelte-1jhvx0t{display:flex;align-items:center;padding:6px}");
    }

    const get_end_slot_changes$1 = dirty => ({});
    const get_end_slot_context$1 = ctx => ({});
    const get_start_slot_changes$1 = dirty => ({});
    const get_start_slot_context$1 = ctx => ({});

    // (65:23)           
    function fallback_block_1$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "svelte-1jhvx0t");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (71:21)           
    function fallback_block$4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "svelte-1jhvx0t");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1y(ctx) {
    	let doric_chip;
    	let t0;
    	let div;
    	let t1;
    	let t2;
    	let doric_chip_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const start_slot_template = /*#slots*/ ctx[4].start;
    	const start_slot = create_slot(start_slot_template, ctx, /*$$scope*/ ctx[3], get_start_slot_context$1);
    	const start_slot_or_fallback = start_slot || fallback_block_1$3();
    	const end_slot_template = /*#slots*/ ctx[4].end;
    	const end_slot = create_slot(end_slot_template, ctx, /*$$scope*/ ctx[3], get_end_slot_context$1);
    	const end_slot_or_fallback = end_slot || fallback_block$4();

    	return {
    		c() {
    			doric_chip = element("doric-chip");
    			if (start_slot_or_fallback) start_slot_or_fallback.c();
    			t0 = space();
    			div = element("div");
    			t1 = text(/*label*/ ctx[0]);
    			t2 = space();
    			if (end_slot_or_fallback) end_slot_or_fallback.c();
    			attr(div, "class", "svelte-1jhvx0t");
    			set_custom_element_data(doric_chip, "class", doric_chip_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-1jhvx0t"));
    			toggle_class(doric_chip, "clickable", /*clickable*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, doric_chip, anchor);

    			if (start_slot_or_fallback) {
    				start_slot_or_fallback.m(doric_chip, null);
    			}

    			append(doric_chip, t0);
    			append(doric_chip, div);
    			append(div, t1);
    			append(doric_chip, t2);

    			if (end_slot_or_fallback) {
    				end_slot_or_fallback.m(doric_chip, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(doric_chip, "click", /*click_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (start_slot) {
    				if (start_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						start_slot,
    						start_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(start_slot_template, /*$$scope*/ ctx[3], dirty, get_start_slot_changes$1),
    						get_start_slot_context$1
    					);
    				}
    			}

    			if (!current || dirty & /*label*/ 1) set_data(t1, /*label*/ ctx[0]);

    			if (end_slot) {
    				if (end_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						end_slot,
    						end_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(end_slot_template, /*$$scope*/ ctx[3], dirty, get_end_slot_changes$1),
    						get_end_slot_context$1
    					);
    				}
    			}

    			if (!current || dirty & /*color*/ 2 && doric_chip_class_value !== (doric_chip_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-1jhvx0t"))) {
    				set_custom_element_data(doric_chip, "class", doric_chip_class_value);
    			}

    			if (!current || dirty & /*color, clickable*/ 6) {
    				toggle_class(doric_chip, "clickable", /*clickable*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(start_slot_or_fallback, local);
    			transition_in(end_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(start_slot_or_fallback, local);
    			transition_out(end_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_chip);
    			if (start_slot_or_fallback) start_slot_or_fallback.d(detaching);
    			if (end_slot_or_fallback) end_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label } = $$props;
    	let { color } = $$props;
    	let { clickable } = $$props;

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('label' in $$props) $$invalidate(0, label = $$props.label);
    		if ('color' in $$props) $$invalidate(1, color = $$props.color);
    		if ('clickable' in $$props) $$invalidate(2, clickable = $$props.clickable);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [label, color, clickable, $$scope, slots, click_handler];
    }

    class Chip extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1a, create_fragment$1y, safe_not_equal, { label: 0, color: 1, clickable: 2 }, add_css$w);
    	}
    }

    /* core\circle-spinner.svelte generated by Svelte v3.55.0 */

    function add_css$v(target) {
    	append_styles(target, "svelte-1giunr6", "@keyframes svelte-1giunr6-rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}circle.svelte-1giunr6{stroke:var(--primary);animation-name:svelte-1giunr6-rotate;animation-iteration-count:infinite;animation-delay:0s;animation-timing-function:linear;transform-origin:50% 50%}.outer.svelte-1giunr6{animation-duration:4s}.middle.svelte-1giunr6{stroke:var(--primary-light);animation-duration:3s;animation-direction:reverse}.inner.svelte-1giunr6{animation-duration:2s}");
    }

    function create_fragment$1x(ctx) {
    	let svg;
    	let circle0;
    	let circle1;
    	let circle2;

    	return {
    		c() {
    			svg = svg_element("svg");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			attr(circle0, "class", "outer svelte-1giunr6");
    			attr(circle0, "cx", 50);
    			attr(circle0, "cy", 50);
    			attr(circle0, "stroke-width", 4);
    			attr(circle0, "fill", "transparent");
    			attr(circle0, "r", 48);
    			attr(circle0, "stroke-dasharray", /*dash*/ ctx[1](48, 2));
    			attr(circle1, "class", "middle svelte-1giunr6");
    			attr(circle1, "cx", 50);
    			attr(circle1, "cy", 50);
    			attr(circle1, "stroke-width", 4);
    			attr(circle1, "fill", "transparent");
    			attr(circle1, "r", 40);
    			attr(circle1, "stroke-dasharray", /*dash*/ ctx[1](40, 2));
    			attr(circle2, "class", "inner svelte-1giunr6");
    			attr(circle2, "cx", 50);
    			attr(circle2, "cy", 50);
    			attr(circle2, "stroke-width", 4);
    			attr(circle2, "fill", "transparent");
    			attr(circle2, "r", 32);
    			attr(circle2, "stroke-dasharray", /*dash*/ ctx[1](32, 4));
    			attr(svg, "width", /*size*/ ctx[0]);
    			attr(svg, "height", /*size*/ ctx[0]);
    			attr(svg, "viewBox", "0 0 100 100");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, circle0);
    			append(svg, circle1);
    			append(svg, circle2);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*size*/ 1) {
    				attr(svg, "width", /*size*/ ctx[0]);
    			}

    			if (dirty & /*size*/ 1) {
    				attr(svg, "height", /*size*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function instance$19($$self, $$props, $$invalidate) {
    	let { size = 100 } = $$props;

    	const dash = (radius, count) => {
    		const circ = Math.PI * 2 * radius;
    		const parts = count * 2;
    		const partSize = circ / parts;
    		return [0, partSize / 2, ...Array.from({ length: parts }, () => partSize)].join(" ");
    	};

    	$$self.$$set = $$props => {
    		if ('size' in $$props) $$invalidate(0, size = $$props.size);
    	};

    	return [size, dash];
    }

    class Circle_spinner$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$19, create_fragment$1x, safe_not_equal, { size: 0 }, add_css$v);
    	}
    }

    /* core\control-drawer.svelte generated by Svelte v3.55.0 */

    function add_css$u(target) {
    	append_styles(target, "svelte-1ibpyai", "control-drawer.svelte-1ibpyai{position:absolute;top:0px;right:0px;height:100%;min-width:25vw;background-color:var(--card-background);overflow-y:auto}");
    }

    // (36:0) {#if show}
    function create_if_block$h(ctx) {
    	let modal;
    	let current;

    	modal = new Modal$1({
    			props: {
    				persistent: /*persistent*/ ctx[0],
    				$$slots: { default: [create_default_slot$B] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close*/ ctx[1]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};
    			if (dirty & /*persistent*/ 1) modal_changes.persistent = /*persistent*/ ctx[0];

    			if (dirty & /*$$scope*/ 32) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (37:4) <Modal on:close={close} {persistent}>
    function create_default_slot$B(ctx) {
    	let control_drawer;
    	let control_drawer_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	return {
    		c() {
    			control_drawer = element("control-drawer");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(control_drawer, "class", "svelte-1ibpyai");
    		},
    		m(target, anchor) {
    			insert(target, control_drawer, anchor);

    			if (default_slot) {
    				default_slot.m(control_drawer, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!control_drawer_transition) control_drawer_transition = create_bidirectional_transition(control_drawer, drawerSlide, {}, true);
    				control_drawer_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!control_drawer_transition) control_drawer_transition = create_bidirectional_transition(control_drawer, drawerSlide, {}, false);
    			control_drawer_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(control_drawer);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && control_drawer_transition) control_drawer_transition.end();
    		}
    	};
    }

    function create_fragment$1w(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[2] && create_if_block$h(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*show*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$h(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    const drawerSlide = (node, options) => {
    	return {
    		delay: 0,
    		duration: 250,
    		css: (t, u) => `
                transform: translateX(${u * 100}%);
                opacity: ${t};
            `
    	};
    };

    function instance$18($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { persistent = false } = $$props;
    	let show = false;
    	const open = () => $$invalidate(2, show = true);
    	const close = () => $$invalidate(2, show = false);

    	$$self.$$set = $$props => {
    		if ('persistent' in $$props) $$invalidate(0, persistent = $$props.persistent);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	return [persistent, close, show, open, slots, $$scope];
    }

    class Control_drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$18, create_fragment$1w, safe_not_equal, { persistent: 0, open: 3, close: 1 }, add_css$u);
    	}

    	get open() {
    		return this.$$.ctx[3];
    	}

    	get close() {
    		return this.$$.ctx[1];
    	}
    }

    /* core\footer.svelte generated by Svelte v3.55.0 */

    function add_css$t(target) {
    	append_styles(target, "svelte-kkshu6", "doric-footer.svelte-kkshu6{display:grid;grid-template-columns:max-content auto max-content;box-shadow:0px -2px 4px var(--shadow-color);height:56px;gap:2px;padding:2px;background-color:var(--card-background);--border-color:var(--layer-border-color)}doric-footer.bordered.svelte-kkshu6{border:1px solid var(--border-color)}footer-area.svelte-kkshu6{display:grid}");
    }

    const get_right_slot_changes = dirty => ({});
    const get_right_slot_context = ctx => ({});
    const get_left_slot_changes = dirty => ({});
    const get_left_slot_context = ctx => ({});

    function create_fragment$1v(ctx) {
    	let doric_footer;
    	let footer_area0;
    	let t0;
    	let footer_area1;
    	let t1;
    	let footer_area2;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const left_slot_template = /*#slots*/ ctx[5].left;
    	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[4], get_left_slot_context);
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	const right_slot_template = /*#slots*/ ctx[5].right;
    	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[4], get_right_slot_context);

    	return {
    		c() {
    			doric_footer = element("doric-footer");
    			footer_area0 = element("footer-area");
    			if (left_slot) left_slot.c();
    			t0 = space();
    			footer_area1 = element("footer-area");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			footer_area2 = element("footer-area");
    			if (right_slot) right_slot.c();
    			set_custom_element_data(footer_area0, "class", "svelte-kkshu6");
    			set_custom_element_data(footer_area1, "class", "svelte-kkshu6");
    			set_custom_element_data(footer_area2, "class", "svelte-kkshu6");
    			set_custom_element_data(doric_footer, "class", "svelte-kkshu6");
    			toggle_class(doric_footer, "bordered", /*bordered*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, doric_footer, anchor);
    			append(doric_footer, footer_area0);

    			if (left_slot) {
    				left_slot.m(footer_area0, null);
    			}

    			append(doric_footer, t0);
    			append(doric_footer, footer_area1);

    			if (default_slot) {
    				default_slot.m(footer_area1, null);
    			}

    			append(doric_footer, t1);
    			append(doric_footer, footer_area2);

    			if (right_slot) {
    				right_slot.m(footer_area2, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, doric_footer, /*footerOpts*/ ctx[1])),
    					action_destroyer(grid_action = grid.call(null, doric_footer, /*$$props*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (left_slot) {
    				if (left_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						left_slot,
    						left_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(left_slot_template, /*$$scope*/ ctx[4], dirty, get_left_slot_changes),
    						get_left_slot_context
    					);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (right_slot) {
    				if (right_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						right_slot,
    						right_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(right_slot_template, /*$$scope*/ ctx[4], dirty, get_right_slot_changes),
    						get_right_slot_context
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*footerOpts*/ 2) vars_action.update.call(null, /*footerOpts*/ ctx[1]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 4) grid_action.update.call(null, /*$$props*/ ctx[2]);

    			if (!current || dirty & /*bordered*/ 1) {
    				toggle_class(doric_footer, "bordered", /*bordered*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(left_slot, local);
    			transition_in(default_slot, local);
    			transition_in(right_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(left_slot, local);
    			transition_out(default_slot, local);
    			transition_out(right_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_footer);
    			if (left_slot) left_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (right_slot) right_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$17($$self, $$props, $$invalidate) {
    	let footerOpts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { bordered = false } = $$props;
    	let { borderColor = null } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('bordered' in $$new_props) $$invalidate(0, bordered = $$new_props.bordered);
    		if ('borderColor' in $$new_props) $$invalidate(3, borderColor = $$new_props.borderColor);
    		if ('$$scope' in $$new_props) $$invalidate(4, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*borderColor*/ 8) {
    			$$invalidate(1, footerOpts = { "border-color": borderColor });
    		}
    	};

    	$$props = exclude_internal_props($$props);
    	return [bordered, footerOpts, $$props, borderColor, $$scope, slots];
    }

    class Footer$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$17, create_fragment$1v, safe_not_equal, { bordered: 0, borderColor: 3 }, add_css$t);
    	}
    }

    /* core\hexagon-spinner.svelte generated by Svelte v3.55.0 */

    function add_css$s(target) {
    	append_styles(target, "svelte-hqd016", "@keyframes svelte-hqd016-rotate{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}path.svelte-hqd016{stroke:var(--primary);animation-name:svelte-hqd016-rotate;animation-iteration-count:infinite;animation-delay:0s;animation-timing-function:linear;transform-origin:50% 50%}.outer.svelte-hqd016{animation-duration:3s}.middle.svelte-hqd016{stroke:var(--primary-light);animation-duration:2s;animation-direction:reverse}.inner.svelte-hqd016{animation-duration:1s}");
    }

    function create_fragment$1u(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr(path0, "class", "outer svelte-hqd016");
    			attr(path0, "stroke-width", 4);
    			attr(path0, "fill", "none");
    			attr(path0, "d", /*hexPath*/ ctx[1](48));
    			attr(path1, "class", "middle svelte-hqd016");
    			attr(path1, "stroke-width", 4);
    			attr(path1, "fill", "none");
    			attr(path1, "d", /*hexPath*/ ctx[1](36));
    			attr(path2, "class", "inner svelte-hqd016");
    			attr(path2, "stroke-width", 4);
    			attr(path2, "fill", "none");
    			attr(path2, "d", /*hexPath*/ ctx[1](24));
    			attr(svg, "width", /*size*/ ctx[0]);
    			attr(svg, "height", /*size*/ ctx[0]);
    			attr(svg, "viewBox", "0 0 100 100");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path0);
    			append(svg, path1);
    			append(svg, path2);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*size*/ 1) {
    				attr(svg, "width", /*size*/ ctx[0]);
    			}

    			if (dirty & /*size*/ 1) {
    				attr(svg, "height", /*size*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function instance$16($$self, $$props, $$invalidate) {
    	let { size = 100 } = $$props;

    	const hexCmd = (cmd, radius, start, inc, tick) => [
    		cmd,
    		Math.cos(start + inc * tick) * radius + 50,
    		Math.sin(start + inc * tick) * radius + 50
    	].join(" ");

    	const hexPath = radius => {
    		const { PI } = Math;
    		const start = PI / 6;
    		const inc = PI / 3;
    		const shape = Array.from({ length: 6 }, (_0, i) => hexCmd("L", radius, start, inc, i));
    		return [hexCmd("M", radius, start, inc, 5), ...shape, "Z"].join(" ");
    	};

    	$$self.$$set = $$props => {
    		if ('size' in $$props) $$invalidate(0, size = $$props.size);
    	};

    	return [size, hexPath];
    }

    class Hexagon_spinner$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$16, create_fragment$1u, safe_not_equal, { size: 0 }, add_css$s);
    	}
    }

    /* core\icon.svelte generated by Svelte v3.55.0 */

    function add_css$r(target) {
    	append_styles(target, "svelte-od4xq0", "doric-icon.svelte-od4xq0{margin:0px 4px;font-size:var(--icon-font-size)}");
    }

    function create_fragment$1t(ctx) {
    	let doric_icon;
    	let doric_icon_class_value;
    	let vars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			doric_icon = element("doric-icon");
    			set_custom_element_data(doric_icon, "class", doric_icon_class_value = "fa-" + /*base*/ ctx[0] + " fa-" + /*icon*/ ctx[1] + " svelte-od4xq0");
    		},
    		m(target, anchor) {
    			insert(target, doric_icon, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_icon, /*iconVars*/ ctx[2]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*base, icon*/ 3 && doric_icon_class_value !== (doric_icon_class_value = "fa-" + /*base*/ ctx[0] + " fa-" + /*icon*/ ctx[1] + " svelte-od4xq0")) {
    				set_custom_element_data(doric_icon, "class", doric_icon_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*iconVars*/ 4) vars_action.update.call(null, /*iconVars*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(doric_icon);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$15($$self, $$props, $$invalidate) {
    	let iconVars;
    	let icon;
    	let base;
    	let { name } = $$props;
    	let { size } = $$props;

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(3, name = $$props.name);
    		if ('size' in $$props) $$invalidate(4, size = $$props.size);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 16) {
    			$$invalidate(2, iconVars = { "icon-font-size": size });
    		}

    		if ($$self.$$.dirty & /*name*/ 8) {
    			$$invalidate(1, [icon, base = "solid"] = (name || "").split(":"), icon, ($$invalidate(0, base), $$invalidate(3, name)));
    		}
    	};

    	return [base, icon, iconVars, name, size];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$15, create_fragment$1t, safe_not_equal, { name: 3, size: 4 }, add_css$r);
    	}
    }

    /* core\image.svelte generated by Svelte v3.55.0 */

    function add_css$q(target) {
    	append_styles(target, "svelte-1w218wu", "img.svelte-1w218wu{width:100%;height:100%;float:var(--float, none);object-fit:var(--image-contain);width:var(--image-width);height:var(--image-height)}");
    }

    function create_fragment$1s(ctx) {
    	let img;
    	let img_src_value;
    	let vars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = /*source*/ ctx[0])) attr(img, "src", img_src_value);
    			attr(img, "alt", /*alt*/ ctx[1]);
    			attr(img, "class", "svelte-1w218wu");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, img, /*props*/ ctx[2]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*source*/ 1 && !src_url_equal(img.src, img_src_value = /*source*/ ctx[0])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*props*/ 4) vars_action.update.call(null, /*props*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(img);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$14($$self, $$props, $$invalidate) {
    	let props;
    	let { source } = $$props;
    	let { alt } = $$props;
    	let { height } = $$props;
    	let { width } = $$props;
    	let { fit = "contain" } = $$props;
    	let { float } = $$props;

    	$$self.$$set = $$props => {
    		if ('source' in $$props) $$invalidate(0, source = $$props.source);
    		if ('alt' in $$props) $$invalidate(1, alt = $$props.alt);
    		if ('height' in $$props) $$invalidate(3, height = $$props.height);
    		if ('width' in $$props) $$invalidate(4, width = $$props.width);
    		if ('fit' in $$props) $$invalidate(5, fit = $$props.fit);
    		if ('float' in $$props) $$invalidate(6, float = $$props.float);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*float, width, height, fit*/ 120) {
    			$$invalidate(2, props = {
    				float,
    				"image-width": width,
    				"image-height": height,
    				"image-contain": fit
    			});
    		}
    	};

    	return [source, alt, props, height, width, fit, float];
    }

    class Image$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$14,
    			create_fragment$1s,
    			safe_not_equal,
    			{
    				source: 0,
    				alt: 1,
    				height: 3,
    				width: 4,
    				fit: 5,
    				float: 6
    			},
    			add_css$q
    		);
    	}
    }

    /* core\list\header.svelte generated by Svelte v3.55.0 */

    function add_css$p(target) {
    	append_styles(target, "svelte-1gqo0fo", "doric-list-header.svelte-1gqo0fo{align-items:center;display:flex;font-weight:700;height:48px;padding:8px;position:sticky;top:0px;z-index:+1;background-color:var(--primary);color:var(--text-invert);font-size:var(--text-size-header)}");
    }

    function create_fragment$1r(ctx) {
    	let doric_list_header;
    	let t;

    	return {
    		c() {
    			doric_list_header = element("doric-list-header");
    			t = text(/*title*/ ctx[0]);
    			set_custom_element_data(doric_list_header, "class", "svelte-1gqo0fo");
    		},
    		m(target, anchor) {
    			insert(target, doric_list_header, anchor);
    			append(doric_list_header, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(doric_list_header);
    		}
    	};
    }

    function instance$13($$self, $$props, $$invalidate) {
    	let { title } = $$props;

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	return [title];
    }

    class Header$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$13, create_fragment$1r, safe_not_equal, { title: 0 }, add_css$p);
    	}
    }

    /* core\list\footer.svelte generated by Svelte v3.55.0 */

    function add_css$o(target) {
    	append_styles(target, "svelte-yo6f30", "doric-list-footer.svelte-yo6f30{bottom:0px;display:grid;grid-template-columns:min-content auto min-content;height:32px;position:sticky;width:100%;background-color:var(--primary);color:var(--text-invert);--text-normal:var(--text-invert)}pagination-info.svelte-yo6f30{display:flex;align-items:center;justify-content:center}");
    }

    // (37:0) {#if pageSize !== null}
    function create_if_block$g(ctx) {
    	let doric_list_footer;
    	let button0;
    	let t0;
    	let pagination_info;
    	let t1;
    	let t2_value = /*page*/ ctx[0] + 1 + "";
    	let t2;
    	let t3;
    	let t4_value = /*maxPage*/ ctx[2] + 1 + "";
    	let t4;
    	let t5;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_1$n] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*prev*/ ctx[3]);

    	button1 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$A] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("click", /*next*/ ctx[4]);

    	return {
    		c() {
    			doric_list_footer = element("doric-list-footer");
    			create_component(button0.$$.fragment);
    			t0 = space();
    			pagination_info = element("pagination-info");
    			t1 = text("Page ");
    			t2 = text(t2_value);
    			t3 = text(" / ");
    			t4 = text(t4_value);
    			t5 = space();
    			create_component(button1.$$.fragment);
    			set_custom_element_data(pagination_info, "class", "svelte-yo6f30");
    			set_custom_element_data(doric_list_footer, "class", "svelte-yo6f30");
    		},
    		m(target, anchor) {
    			insert(target, doric_list_footer, anchor);
    			mount_component(button0, doric_list_footer, null);
    			append(doric_list_footer, t0);
    			append(doric_list_footer, pagination_info);
    			append(pagination_info, t1);
    			append(pagination_info, t2);
    			append(pagination_info, t3);
    			append(pagination_info, t4);
    			append(doric_list_footer, t5);
    			mount_component(button1, doric_list_footer, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			if ((!current || dirty & /*page*/ 1) && t2_value !== (t2_value = /*page*/ ctx[0] + 1 + "")) set_data(t2, t2_value);
    			if ((!current || dirty & /*maxPage*/ 4) && t4_value !== (t4_value = /*maxPage*/ ctx[2] + 1 + "")) set_data(t4, t4_value);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_list_footer);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};
    }

    // (39:8) <Button on:click={prev}>
    function create_default_slot_1$n(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "arrow-left" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (47:8) <Button on:click={next}>
    function create_default_slot$A(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "arrow-right" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    function create_fragment$1q(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*pageSize*/ ctx[1] !== null && create_if_block$g(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*pageSize*/ ctx[1] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*pageSize*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$g(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$12($$self, $$props, $$invalidate) {
    	let maxPage;
    	let { data } = $$props;
    	let { page } = $$props;
    	let { pageSize } = $$props;
    	const prev = () => $$invalidate(0, page = Math.max(0, page - 1));
    	const next = () => $$invalidate(0, page = Math.min(maxPage, page + 1));

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(5, data = $$props.data);
    		if ('page' in $$props) $$invalidate(0, page = $$props.page);
    		if ('pageSize' in $$props) $$invalidate(1, pageSize = $$props.pageSize);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data, pageSize*/ 34) {
    			$$invalidate(2, maxPage = Math.ceil(data.length / (pageSize ?? 1)) - 1);
    		}
    	};

    	return [page, pageSize, maxPage, prev, next, data];
    }

    class Footer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$12, create_fragment$1q, safe_not_equal, { data: 5, page: 0, pageSize: 1 }, add_css$o);
    	}
    }

    /* core\list\body.svelte generated by Svelte v3.55.0 */

    function add_css$n(target) {
    	append_styles(target, "svelte-1a50gqi", "doric-list-item.svelte-1a50gqi{align-items:center;display:flex;height:40px;padding:8px;position:relative;user-select:none;background-color:var(--layer-background)}doric-list-item.svelte-1a50gqi:nth-child(2n){background-color:var(--background)}doric-list-item.clickable.svelte-1a50gqi{cursor:pointer}");
    }

    function get_each_context$9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (43:0) {#each items as item (itemID(item))}
    function create_each_block$9(key_1, ctx) {
    	let doric_list_item;
    	let t0_value = (/*item*/ ctx[6]?.label ?? "") + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*item*/ ctx[6]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			doric_list_item = element("doric-list-item");
    			t0 = text(t0_value);
    			t1 = space();
    			set_custom_element_data(doric_list_item, "class", "svelte-1a50gqi");
    			toggle_class(doric_list_item, "clickable", /*clickable*/ ctx[0]);
    			this.first = doric_list_item;
    		},
    		m(target, anchor) {
    			insert(target, doric_list_item, anchor);
    			append(doric_list_item, t0);
    			append(doric_list_item, t1);

    			if (!mounted) {
    				dispose = listen(doric_list_item, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*items*/ 2 && t0_value !== (t0_value = (/*item*/ ctx[6]?.label ?? "") + "")) set_data(t0, t0_value);

    			if (dirty & /*clickable*/ 1) {
    				toggle_class(doric_list_item, "clickable", /*clickable*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(doric_list_item);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1p(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value = /*items*/ ctx[1];
    	const get_key = ctx => /*itemID*/ ctx[2](/*item*/ ctx[6]);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$9(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$9(key, child_ctx));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*clickable, itemTap, items, itemID*/ 15) {
    				each_value = /*items*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block$9, each_1_anchor, get_each_context$9);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$11($$self, $$props, $$invalidate) {
    	let itemTap;
    	let { clickable } = $$props;
    	let { items } = $$props;
    	let { itemID } = $$props;

    	// export let page
    	// export let pageSize
    	const dispatch = createEventDispatcher();

    	const click_handler = item => itemTap(item);

    	$$self.$$set = $$props => {
    		if ('clickable' in $$props) $$invalidate(0, clickable = $$props.clickable);
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    		if ('itemID' in $$props) $$invalidate(2, itemID = $$props.itemID);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*clickable*/ 1) {
    			$$invalidate(3, itemTap = item => {
    				if (clickable !== true) {
    					return;
    				}

    				dispatch("tap", item);
    			});
    		}
    	};

    	return [clickable, items, itemID, itemTap, click_handler];
    }

    class Body$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$11, create_fragment$1p, safe_not_equal, { clickable: 0, items: 1, itemID: 2 }, add_css$n);
    	}
    }

    /* core\list.svelte generated by Svelte v3.55.0 */

    function add_css$m(target) {
    	append_styles(target, "svelte-1ly9nh6", "doric-list.svelte-1ly9nh6{display:flex;flex-direction:column;overflow:auto;border:1px solid var(--layer-border-color);border-radius:4px}doric-list.flat.svelte-1ly9nh6{border-width:0px}doric-list.square.svelte-1ly9nh6{border-radius:0px}");
    }

    function create_fragment$1o(ctx) {
    	let doric_list;
    	let switch_instance0;
    	let t0;
    	let switch_instance1;
    	let t1;
    	let switch_instance2;
    	let updating_page;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*header*/ ctx[7];

    	function switch_props(ctx) {
    		return {
    			props: {
    				title: /*title*/ ctx[4],
    				cols: /*cols*/ ctx[2],
    				data: /*data*/ ctx[3]
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance0 = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	var switch_value_1 = /*body*/ ctx[6];

    	function switch_props_1(ctx) {
    		return {
    			props: {
    				data: /*data*/ ctx[3],
    				items: /*items*/ ctx[12],
    				cols: /*cols*/ ctx[2],
    				clickable: /*clickable*/ ctx[1],
    				page: /*page*/ ctx[0],
    				pageSize: /*pageSize*/ ctx[9],
    				itemID: /*itemID*/ ctx[5]
    			}
    		};
    	}

    	if (switch_value_1) {
    		switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1(ctx));
    		switch_instance1.$on("click", /*click_handler*/ ctx[14]);
    	}

    	function switch_instance2_page_binding(value) {
    		/*switch_instance2_page_binding*/ ctx[15](value);
    	}

    	var switch_value_2 = /*footer*/ ctx[8];

    	function switch_props_2(ctx) {
    		let switch_instance2_props = {
    			data: /*data*/ ctx[3],
    			pageSize: /*pageSize*/ ctx[9]
    		};

    		if (/*page*/ ctx[0] !== void 0) {
    			switch_instance2_props.page = /*page*/ ctx[0];
    		}

    		return { props: switch_instance2_props };
    	}

    	if (switch_value_2) {
    		switch_instance2 = construct_svelte_component(switch_value_2, switch_props_2(ctx));
    		binding_callbacks.push(() => bind(switch_instance2, 'page', switch_instance2_page_binding, /*page*/ ctx[0]));
    	}

    	return {
    		c() {
    			doric_list = element("doric-list");
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t0 = space();
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			t1 = space();
    			if (switch_instance2) create_component(switch_instance2.$$.fragment);
    			set_custom_element_data(doric_list, "class", "svelte-1ly9nh6");
    			toggle_class(doric_list, "flat", /*flat*/ ctx[10]);
    			toggle_class(doric_list, "square", /*square*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, doric_list, anchor);
    			if (switch_instance0) mount_component(switch_instance0, doric_list, null);
    			append(doric_list, t0);
    			if (switch_instance1) mount_component(switch_instance1, doric_list, null);
    			append(doric_list, t1);
    			if (switch_instance2) mount_component(switch_instance2, doric_list, null);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(grid_action = grid.call(null, doric_list, /*$$props*/ ctx[13]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const switch_instance0_changes = {};
    			if (dirty & /*title*/ 16) switch_instance0_changes.title = /*title*/ ctx[4];
    			if (dirty & /*cols*/ 4) switch_instance0_changes.cols = /*cols*/ ctx[2];
    			if (dirty & /*data*/ 8) switch_instance0_changes.data = /*data*/ ctx[3];

    			if (switch_value !== (switch_value = /*header*/ ctx[7])) {
    				if (switch_instance0) {
    					group_outros();
    					const old_component = switch_instance0;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance0 = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, doric_list, t0);
    				} else {
    					switch_instance0 = null;
    				}
    			} else if (switch_value) {
    				switch_instance0.$set(switch_instance0_changes);
    			}

    			const switch_instance1_changes = {};
    			if (dirty & /*data*/ 8) switch_instance1_changes.data = /*data*/ ctx[3];
    			if (dirty & /*items*/ 4096) switch_instance1_changes.items = /*items*/ ctx[12];
    			if (dirty & /*cols*/ 4) switch_instance1_changes.cols = /*cols*/ ctx[2];
    			if (dirty & /*clickable*/ 2) switch_instance1_changes.clickable = /*clickable*/ ctx[1];
    			if (dirty & /*page*/ 1) switch_instance1_changes.page = /*page*/ ctx[0];
    			if (dirty & /*pageSize*/ 512) switch_instance1_changes.pageSize = /*pageSize*/ ctx[9];
    			if (dirty & /*itemID*/ 32) switch_instance1_changes.itemID = /*itemID*/ ctx[5];

    			if (switch_value_1 !== (switch_value_1 = /*body*/ ctx[6])) {
    				if (switch_instance1) {
    					group_outros();
    					const old_component = switch_instance1;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_1) {
    					switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1(ctx));
    					switch_instance1.$on("click", /*click_handler*/ ctx[14]);
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, doric_list, t1);
    				} else {
    					switch_instance1 = null;
    				}
    			} else if (switch_value_1) {
    				switch_instance1.$set(switch_instance1_changes);
    			}

    			const switch_instance2_changes = {};
    			if (dirty & /*data*/ 8) switch_instance2_changes.data = /*data*/ ctx[3];
    			if (dirty & /*pageSize*/ 512) switch_instance2_changes.pageSize = /*pageSize*/ ctx[9];

    			if (!updating_page && dirty & /*page*/ 1) {
    				updating_page = true;
    				switch_instance2_changes.page = /*page*/ ctx[0];
    				add_flush_callback(() => updating_page = false);
    			}

    			if (switch_value_2 !== (switch_value_2 = /*footer*/ ctx[8])) {
    				if (switch_instance2) {
    					group_outros();
    					const old_component = switch_instance2;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_2) {
    					switch_instance2 = construct_svelte_component(switch_value_2, switch_props_2(ctx));
    					binding_callbacks.push(() => bind(switch_instance2, 'page', switch_instance2_page_binding, /*page*/ ctx[0]));
    					create_component(switch_instance2.$$.fragment);
    					transition_in(switch_instance2.$$.fragment, 1);
    					mount_component(switch_instance2, doric_list, null);
    				} else {
    					switch_instance2 = null;
    				}
    			} else if (switch_value_2) {
    				switch_instance2.$set(switch_instance2_changes);
    			}

    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 8192) grid_action.update.call(null, /*$$props*/ ctx[13]);

    			if (!current || dirty & /*flat*/ 1024) {
    				toggle_class(doric_list, "flat", /*flat*/ ctx[10]);
    			}

    			if (!current || dirty & /*square*/ 2048) {
    				toggle_class(doric_list, "square", /*square*/ ctx[11]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
    			if (switch_instance2) transition_in(switch_instance2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
    			if (switch_instance2) transition_out(switch_instance2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_list);
    			if (switch_instance0) destroy_component(switch_instance0);
    			if (switch_instance1) destroy_component(switch_instance1);
    			if (switch_instance2) destroy_component(switch_instance2);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$10($$self, $$props, $$invalidate) {
    	let items;
    	let { clickable } = $$props;
    	let { cols } = $$props;
    	let { data } = $$props;
    	let { title } = $$props;
    	let { itemID = i => i } = $$props;
    	let { body = Body$1 } = $$props;
    	let { header = Header$1 } = $$props;
    	let { footer = Footer } = $$props;
    	let { page = 0 } = $$props;
    	let { pageSize = null } = $$props;
    	let { flat = false } = $$props;
    	let { square = false } = $$props;

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function switch_instance2_page_binding(value) {
    		page = value;
    		$$invalidate(0, page);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('clickable' in $$new_props) $$invalidate(1, clickable = $$new_props.clickable);
    		if ('cols' in $$new_props) $$invalidate(2, cols = $$new_props.cols);
    		if ('data' in $$new_props) $$invalidate(3, data = $$new_props.data);
    		if ('title' in $$new_props) $$invalidate(4, title = $$new_props.title);
    		if ('itemID' in $$new_props) $$invalidate(5, itemID = $$new_props.itemID);
    		if ('body' in $$new_props) $$invalidate(6, body = $$new_props.body);
    		if ('header' in $$new_props) $$invalidate(7, header = $$new_props.header);
    		if ('footer' in $$new_props) $$invalidate(8, footer = $$new_props.footer);
    		if ('page' in $$new_props) $$invalidate(0, page = $$new_props.page);
    		if ('pageSize' in $$new_props) $$invalidate(9, pageSize = $$new_props.pageSize);
    		if ('flat' in $$new_props) $$invalidate(10, flat = $$new_props.flat);
    		if ('square' in $$new_props) $$invalidate(11, square = $$new_props.square);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pageSize, data, page*/ 521) {
    			$$invalidate(12, items = pageSize === null
    			? data
    			: Array.from({ length: pageSize }, (_, index) => data[page * pageSize + index]));
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		page,
    		clickable,
    		cols,
    		data,
    		title,
    		itemID,
    		body,
    		header,
    		footer,
    		pageSize,
    		flat,
    		square,
    		items,
    		$$props,
    		click_handler,
    		switch_instance2_page_binding
    	];
    }

    class List$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$10,
    			create_fragment$1o,
    			safe_not_equal,
    			{
    				clickable: 1,
    				cols: 2,
    				data: 3,
    				title: 4,
    				itemID: 5,
    				body: 6,
    				header: 7,
    				footer: 8,
    				page: 0,
    				pageSize: 9,
    				flat: 10,
    				square: 11
    			},
    			add_css$m
    		);
    	}
    }

    /* core\text.svelte generated by Svelte v3.55.0 */

    function add_css$l(target) {
    	append_styles(target, "svelte-2e0qn6", "span.svelte-2e0qn6{color:var(--typography-color);font-size:var(--typography-size)}.block.svelte-2e0qn6{display:block}.subtitle.svelte-2e0qn6{font-size:var(--text-size-subtitle)}.primary.svelte-2e0qn6{color:var(--primary)}.secondary.svelte-2e0qn6{color:var(--secondary)}.danger.svelte-2e0qn6{color:var(--danger)}.left.svelte-2e0qn6{text-align:left}.right.svelte-2e0qn6{text-align:right}.center.svelte-2e0qn6{text-align:center}.adorn.svelte-2e0qn6{display:flex;align-items:center;justify-content:center;padding:4px}");
    }

    function create_fragment$1n(ctx) {
    	let span;
    	let span_class_value;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr(span, "class", span_class_value = "" + (/*color*/ ctx[3] + " " + /*align*/ ctx[1] + " svelte-2e0qn6"));
    			toggle_class(span, "block", /*block*/ ctx[2]);
    			toggle_class(span, "adorn", /*adorn*/ ctx[0]);
    			toggle_class(span, "subtitle", /*subtitle*/ ctx[4]);
    			toggle_class(span, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, span, /*textOpts*/ ctx[5])),
    					action_destroyer(grid_action = grid.call(null, span, /*$$props*/ ctx[6]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*color, align*/ 10 && span_class_value !== (span_class_value = "" + (/*color*/ ctx[3] + " " + /*align*/ ctx[1] + " svelte-2e0qn6"))) {
    				attr(span, "class", span_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*textOpts*/ 32) vars_action.update.call(null, /*textOpts*/ ctx[5]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 64) grid_action.update.call(null, /*$$props*/ ctx[6]);

    			if (!current || dirty & /*color, align, block*/ 14) {
    				toggle_class(span, "block", /*block*/ ctx[2]);
    			}

    			if (!current || dirty & /*color, align, adorn*/ 11) {
    				toggle_class(span, "adorn", /*adorn*/ ctx[0]);
    			}

    			if (!current || dirty & /*color, align, subtitle*/ 26) {
    				toggle_class(span, "subtitle", /*subtitle*/ ctx[4]);
    			}

    			if (!current || dirty & /*color, align, adorn*/ 11) {
    				toggle_class(span, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$$($$self, $$props, $$invalidate) {
    	let textOpts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { adorn } = $$props;
    	let { align = "left" } = $$props;
    	let { block = false } = $$props;
    	let { color = "" } = $$props;
    	let { subtitle = false } = $$props;
    	let { textColor = null } = $$props;
    	let { textSize = null } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(6, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('adorn' in $$new_props) $$invalidate(0, adorn = $$new_props.adorn);
    		if ('align' in $$new_props) $$invalidate(1, align = $$new_props.align);
    		if ('block' in $$new_props) $$invalidate(2, block = $$new_props.block);
    		if ('color' in $$new_props) $$invalidate(3, color = $$new_props.color);
    		if ('subtitle' in $$new_props) $$invalidate(4, subtitle = $$new_props.subtitle);
    		if ('textColor' in $$new_props) $$invalidate(7, textColor = $$new_props.textColor);
    		if ('textSize' in $$new_props) $$invalidate(8, textSize = $$new_props.textSize);
    		if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*textColor, textSize*/ 384) {
    			$$invalidate(5, textOpts = {
    				"typography-color": textColor,
    				"typography-size": textSize
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		adorn,
    		align,
    		block,
    		color,
    		subtitle,
    		textOpts,
    		$$props,
    		textColor,
    		textSize,
    		$$scope,
    		slots
    	];
    }

    class Text$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$$,
    			create_fragment$1n,
    			safe_not_equal,
    			{
    				adorn: 0,
    				align: 1,
    				block: 2,
    				color: 3,
    				subtitle: 4,
    				textColor: 7,
    				textSize: 8
    			},
    			add_css$l
    		);
    	}
    }

    /* core\select\option-list.svelte generated by Svelte v3.55.0 */

    function add_css$k(target) {
    	append_styles(target, "svelte-kve6y9", "option-list.svelte-kve6y9{display:grid;grid-template-columns:24px 1fr;grid-auto-rows:40px;padding:8px;gap:2px}");
    }

    function get_each_context$8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i].label;
    	child_ctx[9] = list[i].value;
    	child_ctx[10] = list[i].icon;
    	return child_ctx;
    }

    // (27:12) {#if value === currentValue}
    function create_if_block$f(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { name: "circle-check", size: "20px" }
    		});

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (26:8) <Text adorn {color}>
    function create_default_slot_1$m(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*value*/ ctx[9] === /*currentValue*/ ctx[4] && create_if_block$f();

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*value*/ ctx[9] === /*currentValue*/ ctx[4]) {
    				if (if_block) {
    					if (dirty & /*options, currentValue*/ 24) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$f();
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (31:8) <Button on:click={() => select(value)} {variant} {color} {square}>
    function create_default_slot$z(ctx) {
    	let icon;
    	let t0;
    	let t1_value = /*label*/ ctx[8] + "";
    	let t1;
    	let t2;
    	let current;
    	icon = new Icon({ props: { name: /*icon*/ ctx[10] } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*options*/ 8) icon_changes.name = /*icon*/ ctx[10];
    			icon.$set(icon_changes);
    			if ((!current || dirty & /*options*/ 8) && t1_value !== (t1_value = /*label*/ ctx[8] + "")) set_data(t1, t1_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(t2);
    		}
    	};
    }

    // (25:4) {#each options as {label, value, icon}}
    function create_each_block$8(ctx) {
    	let text_1;
    	let t;
    	let button;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				adorn: true,
    				color: /*color*/ ctx[0],
    				$$slots: { default: [create_default_slot_1$m] },
    				$$scope: { ctx }
    			}
    		});

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*value*/ ctx[9]);
    	}

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[1],
    				color: /*color*/ ctx[0],
    				square: /*square*/ ctx[2],
    				$$slots: { default: [create_default_slot$z] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", click_handler);

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t = space();
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const text_1_changes = {};
    			if (dirty & /*color*/ 1) text_1_changes.color = /*color*/ ctx[0];

    			if (dirty & /*$$scope, options, currentValue*/ 8216) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const button_changes = {};
    			if (dirty & /*variant*/ 2) button_changes.variant = /*variant*/ ctx[1];
    			if (dirty & /*color*/ 1) button_changes.color = /*color*/ ctx[0];
    			if (dirty & /*square*/ 4) button_changes.square = /*square*/ ctx[2];

    			if (dirty & /*$$scope, options*/ 8200) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    function create_fragment$1m(ctx) {
    	let option_list;
    	let current;
    	let each_value = /*options*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$8(get_each_context$8(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			option_list = element("option-list");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(option_list, "class", "svelte-kve6y9");
    		},
    		m(target, anchor) {
    			insert(target, option_list, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(option_list, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*variant, color, square, select, options, currentValue*/ 63) {
    				each_value = /*options*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$8(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$8(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(option_list, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(option_list);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$_($$self, $$props, $$invalidate) {
    	let select;
    	let currentValue;
    	let options;
    	let { color = "primary" } = $$props;
    	let { variant = "outline" } = $$props;
    	let { square = true } = $$props;
    	let { info } = $$props;
    	const click_handler = value => select(value);

    	$$self.$$set = $$props => {
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('variant' in $$props) $$invalidate(1, variant = $$props.variant);
    		if ('square' in $$props) $$invalidate(2, square = $$props.square);
    		if ('info' in $$props) $$invalidate(6, info = $$props.info);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*info*/ 64) {
    			$$invalidate(5, { select, currentValue, options } = info, select, ($$invalidate(4, currentValue), $$invalidate(6, info)), ($$invalidate(3, options), $$invalidate(6, info)));
    		}
    	};

    	return [color, variant, square, options, currentValue, select, info, click_handler];
    }

    class Option_list extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$_, create_fragment$1m, safe_not_equal, { color: 0, variant: 1, square: 2, info: 6 }, add_css$k);
    	}
    }

    /* core\layout\flex.svelte generated by Svelte v3.55.0 */

    function add_css$j(target) {
    	append_styles(target, "svelte-1w2ycr2", "flex-layout.svelte-1w2ycr2{display:flex;flex-wrap:nowrap;overflow:hidden;flex-direction:var(--direction);padding:var(--padding);gap:var(--gap);align-items:var(--item-align);justify-content:var(--item-justify);align-content:var(--content-align)}flex-layout.item-fill.svelte-1w2ycr2>*{flex-grow:1}flex-layout.scrollable.svelte-1w2ycr2{overflow:auto;-webkit-overflow-scrolling:touch;height:100%;scroll-behavior:auto}flex-layout.wrap.svelte-1w2ycr2{flex-wrap:wrap}flex-layout.center.svelte-1w2ycr2{align-items:center;justify-content:center}flex-layout.overflow.svelte-1w2ycr2{overflow:visible}.fit.svelte-1w2ycr2{max-height:100%}flex-layout.svelte-1w2ycr2>flex-break,flex-layout.item-fill.svelte-1w2ycr2>flex-break{flex-basis:100%;height:0;width:0}");
    }

    function create_fragment$1l(ctx) {
    	let flex_layout;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	return {
    		c() {
    			flex_layout = element("flex-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(flex_layout, "class", "svelte-1w2ycr2");
    			toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[3]);
    			toggle_class(flex_layout, "scrollable", /*scrollable*/ ctx[5]);
    			toggle_class(flex_layout, "wrap", /*wrap*/ ctx[6]);
    			toggle_class(flex_layout, "center", /*center*/ ctx[1]);
    			toggle_class(flex_layout, "overflow", /*overflow*/ ctx[4]);
    			toggle_class(flex_layout, "fit", /*fit*/ ctx[2]);
    			toggle_class(flex_layout, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    		},
    		m(target, anchor) {
    			insert(target, flex_layout, anchor);

    			if (default_slot) {
    				default_slot.m(flex_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, flex_layout, /*flexVars*/ ctx[7])),
    					action_destroyer(grid_action = grid.call(null, flex_layout, /*$$props*/ ctx[8]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null),
    						null
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*flexVars*/ 128) vars_action.update.call(null, /*flexVars*/ ctx[7]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 256) grid_action.update.call(null, /*$$props*/ ctx[8]);

    			if (!current || dirty & /*itemFill*/ 8) {
    				toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[3]);
    			}

    			if (!current || dirty & /*scrollable*/ 32) {
    				toggle_class(flex_layout, "scrollable", /*scrollable*/ ctx[5]);
    			}

    			if (!current || dirty & /*wrap*/ 64) {
    				toggle_class(flex_layout, "wrap", /*wrap*/ ctx[6]);
    			}

    			if (!current || dirty & /*center*/ 2) {
    				toggle_class(flex_layout, "center", /*center*/ ctx[1]);
    			}

    			if (!current || dirty & /*overflow*/ 16) {
    				toggle_class(flex_layout, "overflow", /*overflow*/ ctx[4]);
    			}

    			if (!current || dirty & /*fit*/ 4) {
    				toggle_class(flex_layout, "fit", /*fit*/ ctx[2]);
    			}

    			if (!current || dirty & /*adorn*/ 1) {
    				toggle_class(flex_layout, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(flex_layout);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$Z($$self, $$props, $$invalidate) {
    	let flexVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { adorn } = $$props;
    	let { center = false } = $$props;
    	let { contentAlign = "initial" } = $$props;
    	let { direction = "column" } = $$props;
    	let { fit } = $$props;
    	let { gap = "4px" } = $$props;
    	let { itemAlign = "initial" } = $$props;
    	let { itemFill = false } = $$props;
    	let { itemJustify = "initial" } = $$props;
    	let { overflow = false } = $$props;
    	let { padding = "4px" } = $$props;
    	let { scrollable = false } = $$props;
    	let { wrap = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(8, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('adorn' in $$new_props) $$invalidate(0, adorn = $$new_props.adorn);
    		if ('center' in $$new_props) $$invalidate(1, center = $$new_props.center);
    		if ('contentAlign' in $$new_props) $$invalidate(9, contentAlign = $$new_props.contentAlign);
    		if ('direction' in $$new_props) $$invalidate(10, direction = $$new_props.direction);
    		if ('fit' in $$new_props) $$invalidate(2, fit = $$new_props.fit);
    		if ('gap' in $$new_props) $$invalidate(11, gap = $$new_props.gap);
    		if ('itemAlign' in $$new_props) $$invalidate(12, itemAlign = $$new_props.itemAlign);
    		if ('itemFill' in $$new_props) $$invalidate(3, itemFill = $$new_props.itemFill);
    		if ('itemJustify' in $$new_props) $$invalidate(13, itemJustify = $$new_props.itemJustify);
    		if ('overflow' in $$new_props) $$invalidate(4, overflow = $$new_props.overflow);
    		if ('padding' in $$new_props) $$invalidate(14, padding = $$new_props.padding);
    		if ('scrollable' in $$new_props) $$invalidate(5, scrollable = $$new_props.scrollable);
    		if ('wrap' in $$new_props) $$invalidate(6, wrap = $$new_props.wrap);
    		if ('$$scope' in $$new_props) $$invalidate(15, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction, padding, gap, itemAlign, itemJustify, contentAlign*/ 32256) {
    			$$invalidate(7, flexVars = {
    				direction,
    				padding,
    				gap,
    				"item-align": itemAlign,
    				"item-justify": itemJustify,
    				"content-align": contentAlign
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		adorn,
    		center,
    		fit,
    		itemFill,
    		overflow,
    		scrollable,
    		wrap,
    		flexVars,
    		$$props,
    		contentAlign,
    		direction,
    		gap,
    		itemAlign,
    		itemJustify,
    		padding,
    		$$scope,
    		slots
    	];
    }

    class Flex$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$Z,
    			create_fragment$1l,
    			safe_not_equal,
    			{
    				adorn: 0,
    				center: 1,
    				contentAlign: 9,
    				direction: 10,
    				fit: 2,
    				gap: 11,
    				itemAlign: 12,
    				itemFill: 3,
    				itemJustify: 13,
    				overflow: 4,
    				padding: 14,
    				scrollable: 5,
    				wrap: 6
    			},
    			add_css$j
    		);
    	}
    }

    /* core\paper.svelte generated by Svelte v3.55.0 */

    function add_css$i(target) {
    	append_styles(target, "svelte-b2y8fa", "doric-paper.svelte-b2y8fa{display:grid;border-radius:4px;border-style:solid;border-width:0px;box-shadow:0px 2px 4px var(--shadow-color);overflow:hidden;grid-template-columns:1fr;grid-template-rows:min-content auto min-content;background-color:var(--card-background);border-color:var(--border-color, var(--layer-border-color))}doric-paper.card.svelte-b2y8fa{border-width:var(--layer-border-width)}doric-paper.square.svelte-b2y8fa{border-radius:0px}doric-paper.flat.svelte-b2y8fa{box-shadow:none}doric-paper.overflow.svelte-b2y8fa{overflow:visible}");
    }

    const get_action_slot_changes$1 = dirty => ({});
    const get_action_slot_context$1 = ctx => ({});
    const get_title_slot_changes$1 = dirty => ({});
    const get_title_slot_context$1 = ctx => ({});

    // (67:23)           
    function fallback_block_1$2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (70:4) <svelte:component this={layout} {overflow} {...layoutProps}>
    function create_default_slot$y(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (73:24)           
    function fallback_block$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1k(ctx) {
    	let doric_paper;
    	let t0;
    	let switch_instance;
    	let t1;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const title_slot_template = /*#slots*/ ctx[9].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[10], get_title_slot_context$1);
    	const title_slot_or_fallback = title_slot || fallback_block_1$2();
    	const switch_instance_spread_levels = [{ overflow: /*overflow*/ ctx[3] }, /*layoutProps*/ ctx[6]];
    	var switch_value = /*layout*/ ctx[2];

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot$y] },
    			$$scope: { ctx }
    		};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	const action_slot_template = /*#slots*/ ctx[9].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[10], get_action_slot_context$1);
    	const action_slot_or_fallback = action_slot || fallback_block$3();

    	return {
    		c() {
    			doric_paper = element("doric-paper");
    			if (title_slot_or_fallback) title_slot_or_fallback.c();
    			t0 = space();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t1 = space();
    			if (action_slot_or_fallback) action_slot_or_fallback.c();
    			set_custom_element_data(doric_paper, "class", "svelte-b2y8fa");
    			toggle_class(doric_paper, "card", /*card*/ ctx[0]);
    			toggle_class(doric_paper, "flat", /*flat*/ ctx[1]);
    			toggle_class(doric_paper, "square", /*square*/ ctx[4]);
    			toggle_class(doric_paper, "overflow", /*overflow*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, doric_paper, anchor);

    			if (title_slot_or_fallback) {
    				title_slot_or_fallback.m(doric_paper, null);
    			}

    			append(doric_paper, t0);
    			if (switch_instance) mount_component(switch_instance, doric_paper, null);
    			append(doric_paper, t1);

    			if (action_slot_or_fallback) {
    				action_slot_or_fallback.m(doric_paper, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, doric_paper, /*variables*/ ctx[5])),
    					action_destroyer(grid_action = grid.call(null, doric_paper, /*$$props*/ ctx[7]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (title_slot) {
    				if (title_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						title_slot,
    						title_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[10], dirty, get_title_slot_changes$1),
    						get_title_slot_context$1
    					);
    				}
    			}

    			const switch_instance_changes = (dirty & /*overflow, layoutProps*/ 72)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*overflow*/ 8 && { overflow: /*overflow*/ ctx[3] },
    					dirty & /*layoutProps*/ 64 && get_spread_object(/*layoutProps*/ ctx[6])
    				])
    			: {};

    			if (dirty & /*$$scope*/ 1024) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*layout*/ ctx[2])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, doric_paper, t1);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (action_slot) {
    				if (action_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						action_slot,
    						action_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(action_slot_template, /*$$scope*/ ctx[10], dirty, get_action_slot_changes$1),
    						get_action_slot_context$1
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*variables*/ 32) vars_action.update.call(null, /*variables*/ ctx[5]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 128) grid_action.update.call(null, /*$$props*/ ctx[7]);

    			if (!current || dirty & /*card*/ 1) {
    				toggle_class(doric_paper, "card", /*card*/ ctx[0]);
    			}

    			if (!current || dirty & /*flat*/ 2) {
    				toggle_class(doric_paper, "flat", /*flat*/ ctx[1]);
    			}

    			if (!current || dirty & /*square*/ 16) {
    				toggle_class(doric_paper, "square", /*square*/ ctx[4]);
    			}

    			if (!current || dirty & /*overflow*/ 8) {
    				toggle_class(doric_paper, "overflow", /*overflow*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot_or_fallback, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			transition_in(action_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot_or_fallback, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			transition_out(action_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_paper);
    			if (title_slot_or_fallback) title_slot_or_fallback.d(detaching);
    			if (switch_instance) destroy_component(switch_instance);
    			if (action_slot_or_fallback) action_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$Y($$self, $$props, $$invalidate) {
    	let variables;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { borderColor = null } = $$props;
    	let { card } = $$props;
    	let { flat } = $$props;
    	let { layout = Flex$1 } = $$props;
    	let { overflow = false } = $$props;
    	let { square } = $$props;
    	const layoutProps = Object.fromEntries(Object.entries($$props).filter(([key]) => key.startsWith("l") && key !== "layout").map(([key, value]) => [key.slice(1), value]));

    	$$self.$$set = $$new_props => {
    		$$invalidate(7, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('borderColor' in $$new_props) $$invalidate(8, borderColor = $$new_props.borderColor);
    		if ('card' in $$new_props) $$invalidate(0, card = $$new_props.card);
    		if ('flat' in $$new_props) $$invalidate(1, flat = $$new_props.flat);
    		if ('layout' in $$new_props) $$invalidate(2, layout = $$new_props.layout);
    		if ('overflow' in $$new_props) $$invalidate(3, overflow = $$new_props.overflow);
    		if ('square' in $$new_props) $$invalidate(4, square = $$new_props.square);
    		if ('$$scope' in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*borderColor*/ 256) {
    			$$invalidate(5, variables = { "border-color": borderColor });
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		card,
    		flat,
    		layout,
    		overflow,
    		square,
    		variables,
    		layoutProps,
    		$$props,
    		borderColor,
    		slots,
    		$$scope
    	];
    }

    class Paper extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$Y,
    			create_fragment$1k,
    			safe_not_equal,
    			{
    				borderColor: 8,
    				card: 0,
    				flat: 1,
    				layout: 2,
    				overflow: 3,
    				square: 4
    			},
    			add_css$i
    		);
    	}
    }

    /* core\popover.svelte generated by Svelte v3.55.0 */

    function add_css$h(target) {
    	append_styles(target, "svelte-1xiehup", "doric-popover.svelte-1xiehup{position:relative;display:inline-grid;overflow:visible}content-wrapper.svelte-1xiehup{position:absolute;display:grid;z-index:600;top:var(--top);left:var(--left);bottom:var(--bottom);right:var(--right);width:var(--width);height:var(--height)}");
    }

    const get_content_slot_changes = dirty => ({});

    const get_content_slot_context = ctx => ({
    	hide: /*hide*/ ctx[6],
    	show: /*show*/ ctx[5]
    });

    const get_default_slot_changes = dirty => ({});
    const get_default_slot_context = ctx => ({ show: /*show*/ ctx[5] });

    // (54:4) {#if visible}
    function create_if_block$e(ctx) {
    	let modal;
    	let t;
    	let content_wrapper;
    	let vars_action;
    	let content_wrapper_transition;
    	let current;
    	let mounted;
    	let dispose;

    	modal = new Modal$1({
    			props: { open: true, clear: /*clear*/ ctx[0] }
    		});

    	const content_slot_template = /*#slots*/ ctx[11].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[10], get_content_slot_context);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    			t = space();
    			content_wrapper = element("content-wrapper");
    			if (content_slot) content_slot.c();
    			set_custom_element_data(content_wrapper, "class", "svelte-1xiehup");
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			insert(target, t, anchor);
    			insert(target, content_wrapper, anchor);

    			if (content_slot) {
    				content_slot.m(content_wrapper, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, content_wrapper, /*contentVars*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const modal_changes = {};
    			if (dirty & /*clear*/ 1) modal_changes.clear = /*clear*/ ctx[0];
    			modal.$set(modal_changes);

    			if (content_slot) {
    				if (content_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						content_slot,
    						content_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(content_slot_template, /*$$scope*/ ctx[10], dirty, get_content_slot_changes),
    						get_content_slot_context
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*contentVars*/ 8) vars_action.update.call(null, /*contentVars*/ ctx[3]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			transition_in(content_slot, local);

    			add_render_callback(() => {
    				if (!content_wrapper_transition) content_wrapper_transition = create_bidirectional_transition(content_wrapper, fade, /*anim*/ ctx[4], true);
    				content_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			transition_out(content_slot, local);
    			if (!content_wrapper_transition) content_wrapper_transition = create_bidirectional_transition(content_wrapper, fade, /*anim*/ ctx[4], false);
    			content_wrapper_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(content_wrapper);
    			if (content_slot) content_slot.d(detaching);
    			if (detaching && content_wrapper_transition) content_wrapper_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1j(ctx) {
    	let doric_popover;
    	let t;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], get_default_slot_context);
    	let if_block = /*visible*/ ctx[2] && create_if_block$e(ctx);

    	return {
    		c() {
    			doric_popover = element("doric-popover");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			set_custom_element_data(doric_popover, "style", varReset);
    			set_custom_element_data(doric_popover, "class", "svelte-1xiehup");
    		},
    		m(target, anchor) {
    			insert(target, doric_popover, anchor);

    			if (default_slot) {
    				default_slot.m(doric_popover, null);
    			}

    			append(doric_popover, t);
    			if (if_block) if_block.m(doric_popover, null);
    			/*doric_popover_binding*/ ctx[12](doric_popover);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(grid_action = grid.call(null, doric_popover, /*$$props*/ ctx[7]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}

    			if (/*visible*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$e(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(doric_popover, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 128) grid_action.update.call(null, /*$$props*/ ctx[7]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_popover);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    			/*doric_popover_binding*/ ctx[12](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const varReset = "--top: unset; --left: unset; --bottom: unset; --right: unset;";

    function instance$X($$self, $$props, $$invalidate) {
    	let contentVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { anchor = { left: "0px", top: "100%" } } = $$props;
    	let { size = { width: "100%", height: "auto" } } = $$props;
    	let { clear = false } = $$props;
    	const anim = { duration: 250 };
    	let element = null;
    	let visible = false;
    	const show = () => $$invalidate(2, visible = true);
    	const hide = () => $$invalidate(2, visible = false);

    	function doric_popover_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			element = $$value;
    			$$invalidate(1, element);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(7, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('anchor' in $$new_props) $$invalidate(8, anchor = $$new_props.anchor);
    		if ('size' in $$new_props) $$invalidate(9, size = $$new_props.size);
    		if ('clear' in $$new_props) $$invalidate(0, clear = $$new_props.clear);
    		if ('$$scope' in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*anchor, size*/ 768) {
    			$$invalidate(3, contentVars = { ...anchor, ...size });
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		clear,
    		element,
    		visible,
    		contentVars,
    		anim,
    		show,
    		hide,
    		$$props,
    		anchor,
    		size,
    		$$scope,
    		slots,
    		doric_popover_binding
    	];
    }

    class Popover extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$X, create_fragment$1j, safe_not_equal, { anchor: 8, size: 9, clear: 0 }, add_css$h);
    	}
    }

    /* core\radio.svelte generated by Svelte v3.55.0 */

    function add_css$g(target) {
    	append_styles(target, "svelte-1w3kzne", "doric-radio.svelte-1w3kzne.svelte-1w3kzne{display:grid;grid-template-columns:repeat(var(--cols), 1fr);gap:2px;--radio-size:40px}radio-item.svelte-1w3kzne.svelte-1w3kzne{display:grid}radio-item.right.svelte-1w3kzne.svelte-1w3kzne{grid-template-columns:var(--radio-size) auto;grid-template-areas:\"check label\"\r\n        }radio-item.left.svelte-1w3kzne.svelte-1w3kzne{grid-template-columns:auto var(--radio-size);grid-template-areas:\"label check\"\r\n        }radio-item.top.svelte-1w3kzne.svelte-1w3kzne{grid-template-rows:auto var(--radio-size);grid-template-areas:\"label\"\r\n            \"check\"\r\n        }radio-item.bottom.svelte-1w3kzne.svelte-1w3kzne{grid-template-rows:var(--radio-size) auto;grid-template-areas:\"check\"\r\n            \"label\"\r\n        }radio-check.svelte-1w3kzne.svelte-1w3kzne{align-self:center;justify-self:center;grid-area:check}radio-label.svelte-1w3kzne.svelte-1w3kzne{cursor:pointer;display:flex;align-items:center;user-select:none;grid-area:label}.bottom.svelte-1w3kzne radio-label.svelte-1w3kzne,.top.svelte-1w3kzne radio-label.svelte-1w3kzne{justify-content:center}");
    }

    function get_each_context$7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    const get_label_slot_changes = dirty => ({ option: dirty & /*options*/ 4 });
    const get_label_slot_context = ctx => ({ option: /*option*/ ctx[14] });

    // (91:16) <Button round="40px"                  color={option.color}                  disabled={option.disabled}>
    function create_default_slot$x(ctx) {
    	let icon_1;
    	let current;

    	icon_1 = new Icon({
    			props: {
    				name: /*icon*/ ctx[4](/*value*/ ctx[0] === /*option*/ ctx[14].value),
    				size: "16px"
    			}
    		});

    	return {
    		c() {
    			create_component(icon_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*value, options*/ 5) icon_1_changes.name = /*icon*/ ctx[4](/*value*/ ctx[0] === /*option*/ ctx[14].value);
    			icon_1.$set(icon_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};
    }

    // (98:44)                       
    function fallback_block$2(ctx) {
    	let t_value = /*option*/ ctx[14].label + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*options*/ 4 && t_value !== (t_value = /*option*/ ctx[14].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (88:4) {#each options as option (option)}
    function create_each_block$7(key_1, ctx) {
    	let radio_item;
    	let radio_check;
    	let button;
    	let t0;
    	let radio_label;
    	let t1;
    	let radio_item_class_value;
    	let current;
    	let mounted;
    	let dispose;

    	button = new Button({
    			props: {
    				round: "40px",
    				color: /*option*/ ctx[14].color,
    				disabled: /*option*/ ctx[14].disabled,
    				$$slots: { default: [create_default_slot$x] },
    				$$scope: { ctx }
    			}
    		});

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*option*/ ctx[14]);
    	}

    	const label_slot_template = /*#slots*/ ctx[10].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[13], get_label_slot_context);
    	const label_slot_or_fallback = label_slot || fallback_block$2(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[12](/*option*/ ctx[14]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			radio_item = element("radio-item");
    			radio_check = element("radio-check");
    			create_component(button.$$.fragment);
    			t0 = space();
    			radio_label = element("radio-label");
    			if (label_slot_or_fallback) label_slot_or_fallback.c();
    			t1 = space();
    			set_custom_element_data(radio_check, "class", "svelte-1w3kzne");
    			set_custom_element_data(radio_label, "class", "svelte-1w3kzne");
    			set_custom_element_data(radio_item, "class", radio_item_class_value = "" + (null_to_empty(/*labelPosition*/ ctx[1]) + " svelte-1w3kzne"));
    			this.first = radio_item;
    		},
    		m(target, anchor) {
    			insert(target, radio_item, anchor);
    			append(radio_item, radio_check);
    			mount_component(button, radio_check, null);
    			append(radio_item, t0);
    			append(radio_item, radio_label);

    			if (label_slot_or_fallback) {
    				label_slot_or_fallback.m(radio_label, null);
    			}

    			append(radio_item, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(radio_check, "click", click_handler),
    					listen(radio_label, "click", click_handler_1)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};
    			if (dirty & /*options*/ 4) button_changes.color = /*option*/ ctx[14].color;
    			if (dirty & /*options*/ 4) button_changes.disabled = /*option*/ ctx[14].disabled;

    			if (dirty & /*$$scope, value, options*/ 8197) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (label_slot) {
    				if (label_slot.p && (!current || dirty & /*$$scope, options*/ 8196)) {
    					update_slot_base(
    						label_slot,
    						label_slot_template,
    						ctx,
    						/*$$scope*/ ctx[13],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
    						: get_slot_changes(label_slot_template, /*$$scope*/ ctx[13], dirty, get_label_slot_changes),
    						get_label_slot_context
    					);
    				}
    			} else {
    				if (label_slot_or_fallback && label_slot_or_fallback.p && (!current || dirty & /*options*/ 4)) {
    					label_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}

    			if (!current || dirty & /*labelPosition*/ 2 && radio_item_class_value !== (radio_item_class_value = "" + (null_to_empty(/*labelPosition*/ ctx[1]) + " svelte-1w3kzne"))) {
    				set_custom_element_data(radio_item, "class", radio_item_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(label_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(label_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(radio_item);
    			destroy_component(button);
    			if (label_slot_or_fallback) label_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$1i(ctx) {
    	let doric_radio;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[2];
    	const get_key = ctx => /*option*/ ctx[14];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$7(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$7(key, child_ctx));
    	}

    	return {
    		c() {
    			doric_radio = element("doric-radio");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(doric_radio, "class", "svelte-1w3kzne");
    		},
    		m(target, anchor) {
    			insert(target, doric_radio, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(doric_radio, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_radio, /*radioCols*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*labelPosition, update, options, $$scope, icon, value*/ 8247) {
    				each_value = /*options*/ ctx[2];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, doric_radio, outro_and_destroy_block, create_each_block$7, null, get_each_context$7);
    				check_outros();
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*radioCols*/ 8) vars_action.update.call(null, /*radioCols*/ ctx[3]);
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_radio);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$W($$self, $$props, $$invalidate) {
    	let radioCols;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { checkedIcon = "check-circle" } = $$props;
    	let { cols = 1 } = $$props;
    	let { labelPosition = "right" } = $$props;
    	let { labelToggle = true } = $$props;
    	let { options } = $$props;
    	let { uncheckedIcon = "circle" } = $$props;
    	let { value } = $$props;
    	const icon = checked => checked ? checkedIcon : uncheckedIcon;

    	const update = (newValue, isLabel = false) => {
    		if (labelToggle === false && isLabel === true) {
    			return;
    		}

    		$$invalidate(0, value = newValue);
    	};

    	const click_handler = option => update(option.value);
    	const click_handler_1 = option => update(option.value, true);

    	$$self.$$set = $$props => {
    		if ('checkedIcon' in $$props) $$invalidate(6, checkedIcon = $$props.checkedIcon);
    		if ('cols' in $$props) $$invalidate(7, cols = $$props.cols);
    		if ('labelPosition' in $$props) $$invalidate(1, labelPosition = $$props.labelPosition);
    		if ('labelToggle' in $$props) $$invalidate(8, labelToggle = $$props.labelToggle);
    		if ('options' in $$props) $$invalidate(2, options = $$props.options);
    		if ('uncheckedIcon' in $$props) $$invalidate(9, uncheckedIcon = $$props.uncheckedIcon);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('$$scope' in $$props) $$invalidate(13, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*cols*/ 128) {
    			$$invalidate(3, radioCols = { cols });
    		}
    	};

    	return [
    		value,
    		labelPosition,
    		options,
    		radioCols,
    		icon,
    		update,
    		checkedIcon,
    		cols,
    		labelToggle,
    		uncheckedIcon,
    		slots,
    		click_handler,
    		click_handler_1,
    		$$scope
    	];
    }

    class Radio extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$W,
    			create_fragment$1i,
    			safe_not_equal,
    			{
    				checkedIcon: 6,
    				cols: 7,
    				labelPosition: 1,
    				labelToggle: 8,
    				options: 2,
    				uncheckedIcon: 9,
    				value: 0
    			},
    			add_css$g
    		);
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /* core\screen.svelte generated by Svelte v3.55.0 */

    function add_css$f(target) {
    	append_styles(target, "svelte-vxf966", "doric-screen.svelte-vxf966{display:grid;width:calc(100% - var(--sub-pixel-offset));height:calc(100% - 1px);overflow:hidden;position:absolute;background-color:rgba(0, 0, 0, 0.5);grid-template-columns:auto\r\n            min(\r\n                calc(\r\n                    var(--parent-width) - calc(16px * var(--stack))\r\n                ),\r\n                var(--screen-width)\r\n            )\r\n            auto\r\n        ;grid-template-rows:min-content auto min-content;grid-template-areas:var(--title-row, \". title .\")\r\n            var(--content-row, \". content .\")\r\n            var(--footer-row, \". footer .\")\r\n        ;padding-top:calc(8px * var(--stack));padding-bottom:0px}doric-screen.main.svelte-vxf966{background-color:transparent}.full-title.svelte-vxf966,.full.svelte-vxf966{--title-row:\"title title title\"}.full-content.svelte-vxf966,.full.svelte-vxf966{--content-row:\"content content content\"}.full-footer.svelte-vxf966,.full.svelte-vxf966{--footer-row:\"footer footer footer\"}title-area.svelte-vxf966{display:grid;grid-area:title}footer-area.svelte-vxf966{display:grid;grid-area:footer}content-area.svelte-vxf966{display:grid;grid-area:content;height:100%;overflow:hidden}");
    }

    const get_footer_slot_changes = dirty => ({});
    const get_footer_slot_context = ctx => ({});
    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});

    // (138:4) {#if $$slots.title}
    function create_if_block_1$7(ctx) {
    	let title_area;
    	let title_area_transition;
    	let current;
    	const title_slot_template = /*#slots*/ ctx[16].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[15], get_title_slot_context);

    	return {
    		c() {
    			title_area = element("title-area");
    			if (title_slot) title_slot.c();
    			set_custom_element_data(title_area, "class", "svelte-vxf966");
    		},
    		m(target, anchor) {
    			insert(target, title_area, anchor);

    			if (title_slot) {
    				title_slot.m(title_area, null);
    			}

    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (title_slot) {
    				if (title_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot_base(
    						title_slot,
    						title_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[15], dirty, get_title_slot_changes),
    						get_title_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot, local);

    			add_render_callback(() => {
    				if (!title_area_transition) title_area_transition = create_bidirectional_transition(title_area, fly, { y: window.innerHeight, duration }, true);
    				title_area_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot, local);
    			if (!title_area_transition) title_area_transition = create_bidirectional_transition(title_area, fly, { y: window.innerHeight, duration }, false);
    			title_area_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(title_area);
    			if (title_slot) title_slot.d(detaching);
    			if (detaching && title_area_transition) title_area_transition.end();
    		}
    	};
    }

    // (146:4) {#if $$slots.footer}
    function create_if_block$d(ctx) {
    	let footer_area;
    	let footer_area_transition;
    	let current;
    	const footer_slot_template = /*#slots*/ ctx[16].footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[15], get_footer_slot_context);

    	return {
    		c() {
    			footer_area = element("footer-area");
    			if (footer_slot) footer_slot.c();
    			set_custom_element_data(footer_area, "class", "svelte-vxf966");
    		},
    		m(target, anchor) {
    			insert(target, footer_area, anchor);

    			if (footer_slot) {
    				footer_slot.m(footer_area, null);
    			}

    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (footer_slot) {
    				if (footer_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot_base(
    						footer_slot,
    						footer_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(footer_slot_template, /*$$scope*/ ctx[15], dirty, get_footer_slot_changes),
    						get_footer_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(footer_slot, local);

    			add_render_callback(() => {
    				if (!footer_area_transition) footer_area_transition = create_bidirectional_transition(footer_area, fly, { y: window.innerHeight, duration }, true);
    				footer_area_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(footer_slot, local);
    			if (!footer_area_transition) footer_area_transition = create_bidirectional_transition(footer_area, fly, { y: window.innerHeight, duration }, false);
    			footer_area_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(footer_area);
    			if (footer_slot) footer_slot.d(detaching);
    			if (detaching && footer_area_transition) footer_area_transition.end();
    		}
    	};
    }

    function create_fragment$1h(ctx) {
    	let doric_screen;
    	let t0;
    	let content_area;
    	let content_area_transition;
    	let t1;
    	let vars_action;
    	let t2;
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$$slots*/ ctx[10].title && create_if_block_1$7(ctx);
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);
    	let if_block1 = /*$$slots*/ ctx[10].footer && create_if_block$d(ctx);
    	const switch_instance_spread_levels = [/*stackProps*/ ctx[5]];
    	var switch_value = /*stackComp*/ ctx[4];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    	}

    	return {
    		c() {
    			doric_screen = element("doric-screen");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			content_area = element("content-area");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    			set_custom_element_data(content_area, "class", "svelte-vxf966");
    			set_custom_element_data(doric_screen, "class", "svelte-vxf966");
    			toggle_class(doric_screen, "full", /*full*/ ctx[0]);
    			toggle_class(doric_screen, "full-title", /*fullTitle*/ ctx[3]);
    			toggle_class(doric_screen, "full-content", /*fullContent*/ ctx[1]);
    			toggle_class(doric_screen, "full-footer", /*fullFooter*/ ctx[2]);
    			toggle_class(doric_screen, "main", /*level*/ ctx[7] === 0);
    		},
    		m(target, anchor) {
    			insert(target, doric_screen, anchor);
    			if (if_block0) if_block0.m(doric_screen, null);
    			append(doric_screen, t0);
    			append(doric_screen, content_area);

    			if (default_slot) {
    				default_slot.m(content_area, null);
    			}

    			append(doric_screen, t1);
    			if (if_block1) if_block1.m(doric_screen, null);
    			insert(target, t2, anchor);
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_screen, /*screenVars*/ ctx[6]));
    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (/*$$slots*/ ctx[10].title) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 1024) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$7(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(doric_screen, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null),
    						null
    					);
    				}
    			}

    			if (/*$$slots*/ ctx[10].footer) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 1024) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$d(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(doric_screen, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*screenVars*/ 64) vars_action.update.call(null, /*screenVars*/ ctx[6]);

    			if (!current || dirty & /*full*/ 1) {
    				toggle_class(doric_screen, "full", /*full*/ ctx[0]);
    			}

    			if (!current || dirty & /*fullTitle*/ 8) {
    				toggle_class(doric_screen, "full-title", /*fullTitle*/ ctx[3]);
    			}

    			if (!current || dirty & /*fullContent*/ 2) {
    				toggle_class(doric_screen, "full-content", /*fullContent*/ ctx[1]);
    			}

    			if (!current || dirty & /*fullFooter*/ 4) {
    				toggle_class(doric_screen, "full-footer", /*fullFooter*/ ctx[2]);
    			}

    			const switch_instance_changes = (dirty & /*stackProps*/ 32)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*stackProps*/ ctx[5])])
    			: {};

    			if (switch_value !== (switch_value = /*stackComp*/ ctx[4])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!content_area_transition) content_area_transition = create_bidirectional_transition(content_area, fly, { y: window.innerHeight, duration }, true);
    				content_area_transition.run(1);
    			});

    			transition_in(if_block1);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(default_slot, local);
    			if (!content_area_transition) content_area_transition = create_bidirectional_transition(content_area, fly, { y: window.innerHeight, duration }, false);
    			content_area_transition.run(0);
    			transition_out(if_block1);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_screen);
    			if (if_block0) if_block0.d();
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && content_area_transition) content_area_transition.end();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const resolveContext = Symbol("Close Context");
    const levelContext = Symbol("Level Context");
    const widthContext = Symbol("Width Context");
    let topResolver = null;
    const duration = 350;

    function instance$V($$self, $$props, $$invalidate) {
    	let screenVars;
    	let $parentResolve;
    	let $resolver;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { full = false } = $$props;
    	let { fullContent = false } = $$props;
    	let { fullFooter = false } = $$props;
    	let { fullTitle = false } = $$props;
    	let { width = "min(720px, 100%)" } = $$props;
    	const level = getContext(levelContext) ?? 0;
    	const parentResolve = getContext(resolveContext) ?? writable(null);
    	component_subscribe($$self, parentResolve, value => $$invalidate(17, $parentResolve = value));
    	const parentWidth = getContext(widthContext) ?? "100%";
    	let stackComp = null;
    	let stackProps = {};
    	const resolver = writable(null);
    	component_subscribe($$self, resolver, value => $$invalidate(18, $resolver = value));
    	setContext(levelContext, level + 1);
    	setContext(resolveContext, resolver);
    	setContext(widthContext, width);
    	Math.random().toString();

    	const openStack = (component, props = {}) => new Promise(resolve => {
    			set_store_value(
    				resolver,
    				$resolver = value => {
    					$$invalidate(4, stackComp = null);
    					$$invalidate(5, stackProps = null);
    					resolve(value);
    				},
    				$resolver
    			);

    			$$invalidate(4, stackComp = component);
    			$$invalidate(5, stackProps = props);

    			if (level !== 0) {
    				return;
    			}

    			topResolver = $resolver;
    		});

    	const closeAll = (value = null) => topResolver(value);

    	const close = value => {
    		if ($parentResolve === null) {
    			return;
    		}

    		$parentResolve(value);
    	};

    	$$self.$$set = $$props => {
    		if ('full' in $$props) $$invalidate(0, full = $$props.full);
    		if ('fullContent' in $$props) $$invalidate(1, fullContent = $$props.fullContent);
    		if ('fullFooter' in $$props) $$invalidate(2, fullFooter = $$props.fullFooter);
    		if ('fullTitle' in $$props) $$invalidate(3, fullTitle = $$props.fullTitle);
    		if ('width' in $$props) $$invalidate(11, width = $$props.width);
    		if ('$$scope' in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width*/ 2048) {
    			$$invalidate(6, screenVars = {
    				"parent-width": parentWidth,
    				"screen-width": width,
    				"stack": level
    			});
    		}
    	};

    	return [
    		full,
    		fullContent,
    		fullFooter,
    		fullTitle,
    		stackComp,
    		stackProps,
    		screenVars,
    		level,
    		parentResolve,
    		resolver,
    		$$slots,
    		width,
    		openStack,
    		closeAll,
    		close,
    		$$scope,
    		slots
    	];
    }

    class Screen$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$V,
    			create_fragment$1h,
    			safe_not_equal,
    			{
    				full: 0,
    				fullContent: 1,
    				fullFooter: 2,
    				fullTitle: 3,
    				width: 11,
    				openStack: 12,
    				closeAll: 13,
    				close: 14
    			},
    			add_css$f
    		);
    	}

    	get openStack() {
    		return this.$$.ctx[12];
    	}

    	get closeAll() {
    		return this.$$.ctx[13];
    	}

    	get close() {
    		return this.$$.ctx[14];
    	}
    }

    /* core\text-input.svelte generated by Svelte v3.55.0 */

    function add_css$e(target) {
    	append_styles(target, "svelte-183pe89", "doric-text-input.svelte-183pe89.svelte-183pe89{position:relative;display:grid;cursor:text;grid-template-columns:minmax(min-content, max-content)\r\n            1fr\r\n            minmax(min-content, max-content)\r\n        ;grid-template-rows:max-content auto max-content;grid-template-areas:\"label label label\"\r\n            \"start input end\"\r\n            \"extra extra extra\"\r\n        }doric-text-input.svelte-183pe89.svelte-183pe89::after{content:\"\";top:0px;bottom:0px;left:0px;right:0px;border:1px solid var(--control-border);border-radius:4px;pointer-events:none;grid-area:label / label / input / label}doric-text-input.svelte-183pe89.svelte-183pe89:not(.error):focus-within{--control-border:var(--primary)}doric-text-input.error.svelte-183pe89.svelte-183pe89{--control-border:var(--danger)}doric-text-input.flat.svelte-183pe89.svelte-183pe89::after{border-width:0px;border-bottom:2px solid var(--control-border);border-radius:0px}doric-text-input.adorn.svelte-183pe89.svelte-183pe89{margin:4px}input.svelte-183pe89.svelte-183pe89{background-color:transparent;color:var(--text-normal);font:var(--font);border-width:0px;min-height:28px;padding:4px;min-width:20px;grid-area:input}input.svelte-183pe89.svelte-183pe89:focus{outline:none}input-label.svelte-183pe89.svelte-183pe89{display:block;user-select:none;font-size:13px;grid-area:label;padding:2px 16px;border-bottom-right-radius:4px;width:max-content;cursor:default;border-bottom:1px solid var(--control-border);border-right:1px solid var(--control-border);color:var(--control-border)}.flat.svelte-183pe89 input-label.svelte-183pe89{border-width:0px}extra-text.svelte-183pe89.svelte-183pe89{display:block;grid-area:extra;padding:2px 4px;color:var(--text-normal);font-size:var(--text-size-secondary)}.error.svelte-183pe89>extra-text.svelte-183pe89{color:var(--danger)}extra-text.svelte-183pe89.svelte-183pe89:empty,input-label.svelte-183pe89.svelte-183pe89:empty{display:none}start-slot.svelte-183pe89.svelte-183pe89{display:grid;grid-area:start}end-slot.svelte-183pe89.svelte-183pe89{display:grid;grid-area:end}");
    }

    const get_end_slot_changes = dirty => ({});
    const get_end_slot_context = ctx => ({});
    const get_start_slot_changes = dirty => ({});
    const get_start_slot_context = ctx => ({});

    // (136:4) {#if $$slots.start}
    function create_if_block_1$6(ctx) {
    	let start_slot;
    	let current;
    	const start_slot_template = /*#slots*/ ctx[14].start;
    	const start_slot_1 = create_slot(start_slot_template, ctx, /*$$scope*/ ctx[13], get_start_slot_context);

    	return {
    		c() {
    			start_slot = element("start-slot");
    			if (start_slot_1) start_slot_1.c();
    			set_custom_element_data(start_slot, "class", "svelte-183pe89");
    		},
    		m(target, anchor) {
    			insert(target, start_slot, anchor);

    			if (start_slot_1) {
    				start_slot_1.m(start_slot, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (start_slot_1) {
    				if (start_slot_1.p && (!current || dirty & /*$$scope*/ 8192)) {
    					update_slot_base(
    						start_slot_1,
    						start_slot_template,
    						ctx,
    						/*$$scope*/ ctx[13],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
    						: get_slot_changes(start_slot_template, /*$$scope*/ ctx[13], dirty, get_start_slot_changes),
    						get_start_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(start_slot_1, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(start_slot_1, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(start_slot);
    			if (start_slot_1) start_slot_1.d(detaching);
    		}
    	};
    }

    // (148:4) {#if $$slots.end}
    function create_if_block$c(ctx) {
    	let end_slot;
    	let current;
    	const end_slot_template = /*#slots*/ ctx[14].end;
    	const end_slot_1 = create_slot(end_slot_template, ctx, /*$$scope*/ ctx[13], get_end_slot_context);

    	return {
    		c() {
    			end_slot = element("end-slot");
    			if (end_slot_1) end_slot_1.c();
    			set_custom_element_data(end_slot, "class", "svelte-183pe89");
    		},
    		m(target, anchor) {
    			insert(target, end_slot, anchor);

    			if (end_slot_1) {
    				end_slot_1.m(end_slot, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (end_slot_1) {
    				if (end_slot_1.p && (!current || dirty & /*$$scope*/ 8192)) {
    					update_slot_base(
    						end_slot_1,
    						end_slot_template,
    						ctx,
    						/*$$scope*/ ctx[13],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
    						: get_slot_changes(end_slot_template, /*$$scope*/ ctx[13], dirty, get_end_slot_changes),
    						get_end_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(end_slot_1, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(end_slot_1, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(end_slot);
    			if (end_slot_1) end_slot_1.d(detaching);
    		}
    	};
    }

    function create_fragment$1g(ctx) {
    	let doric_text_input;
    	let input_label;
    	let t0;
    	let t1;
    	let t2;
    	let input_1;
    	let t3;
    	let t4;
    	let extra_text;
    	let t5_value = (/*error*/ ctx[0] ?? /*extra*/ ctx[3]) + "";
    	let t5;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$$slots*/ ctx[9].start && create_if_block_1$6(ctx);
    	let input_1_levels = [{ type: "text" }, /*$$props*/ ctx[8]];
    	let input_1_data = {};

    	for (let i = 0; i < input_1_levels.length; i += 1) {
    		input_1_data = assign(input_1_data, input_1_levels[i]);
    	}

    	let if_block1 = /*$$slots*/ ctx[9].end && create_if_block$c(ctx);

    	return {
    		c() {
    			doric_text_input = element("doric-text-input");
    			input_label = element("input-label");
    			t0 = text(/*label*/ ctx[5]);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			input_1 = element("input");
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			extra_text = element("extra-text");
    			t5 = text(t5_value);
    			set_custom_element_data(input_label, "class", "svelte-183pe89");
    			set_attributes(input_1, input_1_data);
    			toggle_class(input_1, "svelte-183pe89", true);
    			set_custom_element_data(extra_text, "class", "svelte-183pe89");
    			set_custom_element_data(doric_text_input, "tabindex", "-1");
    			set_custom_element_data(doric_text_input, "class", "svelte-183pe89");
    			toggle_class(doric_text_input, "adorn", /*adorn*/ ctx[2]);
    			toggle_class(doric_text_input, "error", /*error*/ ctx[0]);
    			toggle_class(doric_text_input, "flat", /*flat*/ ctx[4]);
    			toggle_class(doric_text_input, "ignore-appbar-reskin", /*adorn*/ ctx[2] === "no-reskin");
    		},
    		m(target, anchor) {
    			insert(target, doric_text_input, anchor);
    			append(doric_text_input, input_label);
    			append(input_label, t0);
    			append(doric_text_input, t1);
    			if (if_block0) if_block0.m(doric_text_input, null);
    			append(doric_text_input, t2);
    			append(doric_text_input, input_1);
    			if (input_1.autofocus) input_1.focus();
    			set_input_value(input_1, /*value*/ ctx[1]);
    			/*input_1_binding*/ ctx[18](input_1);
    			append(doric_text_input, t3);
    			if (if_block1) if_block1.m(doric_text_input, null);
    			append(doric_text_input, t4);
    			append(doric_text_input, extra_text);
    			append(extra_text, t5);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input_1, "input", /*input_1_input_handler*/ ctx[17]),
    					listen(input_1, "focus", /*focus_handler*/ ctx[15]),
    					listen(input_1, "blur", /*blur_handler*/ ctx[16]),
    					listen(doric_text_input, "focus", /*focus*/ ctx[6]),
    					action_destroyer(grid_action = grid.call(null, doric_text_input, /*$$props*/ ctx[8]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*label*/ 32) set_data(t0, /*label*/ ctx[5]);

    			if (/*$$slots*/ ctx[9].start) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 512) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$6(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(doric_text_input, t2);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			set_attributes(input_1, input_1_data = get_spread_update(input_1_levels, [{ type: "text" }, dirty & /*$$props*/ 256 && /*$$props*/ ctx[8]]));

    			if (dirty & /*value*/ 2 && input_1.value !== /*value*/ ctx[1]) {
    				set_input_value(input_1, /*value*/ ctx[1]);
    			}

    			toggle_class(input_1, "svelte-183pe89", true);

    			if (/*$$slots*/ ctx[9].end) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 512) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$c(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(doric_text_input, t4);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*error, extra*/ 9) && t5_value !== (t5_value = (/*error*/ ctx[0] ?? /*extra*/ ctx[3]) + "")) set_data(t5, t5_value);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 256) grid_action.update.call(null, /*$$props*/ ctx[8]);

    			if (!current || dirty & /*adorn*/ 4) {
    				toggle_class(doric_text_input, "adorn", /*adorn*/ ctx[2]);
    			}

    			if (!current || dirty & /*error*/ 1) {
    				toggle_class(doric_text_input, "error", /*error*/ ctx[0]);
    			}

    			if (!current || dirty & /*flat*/ 16) {
    				toggle_class(doric_text_input, "flat", /*flat*/ ctx[4]);
    			}

    			if (!current || dirty & /*adorn*/ 4) {
    				toggle_class(doric_text_input, "ignore-appbar-reskin", /*adorn*/ ctx[2] === "no-reskin");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_text_input);
    			if (if_block0) if_block0.d();
    			/*input_1_binding*/ ctx[18](null);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$U($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { adorn } = $$props;
    	let { error = null } = $$props;
    	let { extra = "" } = $$props;
    	let { flat } = $$props;
    	let { label = "" } = $$props;
    	let { value = "" } = $$props;
    	let { validate = null } = $$props;
    	let { transform = text => text } = $$props;
    	let { tvalue } = $$props;
    	let input = null;
    	const focus = () => input.focus();

    	function focus_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function blur_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_1_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(7, input);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(8, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('adorn' in $$new_props) $$invalidate(2, adorn = $$new_props.adorn);
    		if ('error' in $$new_props) $$invalidate(0, error = $$new_props.error);
    		if ('extra' in $$new_props) $$invalidate(3, extra = $$new_props.extra);
    		if ('flat' in $$new_props) $$invalidate(4, flat = $$new_props.flat);
    		if ('label' in $$new_props) $$invalidate(5, label = $$new_props.label);
    		if ('value' in $$new_props) $$invalidate(1, value = $$new_props.value);
    		if ('validate' in $$new_props) $$invalidate(11, validate = $$new_props.validate);
    		if ('transform' in $$new_props) $$invalidate(12, transform = $$new_props.transform);
    		if ('tvalue' in $$new_props) $$invalidate(10, tvalue = $$new_props.tvalue);
    		if ('$$scope' in $$new_props) $$invalidate(13, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*transform, value*/ 4098) {
    			$$invalidate(10, tvalue = transform(value));
    		}

    		if ($$self.$$.dirty & /*validate, tvalue, error*/ 3073) {
    			if (validate !== null) {
    				$$invalidate(0, error = validate(tvalue));
    				$$invalidate(10, tvalue = error === null ? tvalue : undefined);
    			}
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		error,
    		value,
    		adorn,
    		extra,
    		flat,
    		label,
    		focus,
    		input,
    		$$props,
    		$$slots,
    		tvalue,
    		validate,
    		transform,
    		$$scope,
    		slots,
    		focus_handler,
    		blur_handler,
    		input_1_input_handler,
    		input_1_binding
    	];
    }

    class Text_input$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$U,
    			create_fragment$1g,
    			safe_not_equal,
    			{
    				adorn: 2,
    				error: 0,
    				extra: 3,
    				flat: 4,
    				label: 5,
    				value: 1,
    				validate: 11,
    				transform: 12,
    				tvalue: 10,
    				focus: 6
    			},
    			add_css$e
    		);
    	}

    	get focus() {
    		return this.$$.ctx[6];
    	}
    }

    /* core\titlebar.svelte generated by Svelte v3.55.0 */

    function add_css$d(target) {
    	append_styles(target, "svelte-kcm7hr", "doric-title-bar.svelte-kcm7hr{position:relative;z-index:+0;grid-template-rows:48px min-content;background-color:var(--background-layer);color:var(--text-normal);display:grid}doric-title-bar.sticky.svelte-kcm7hr{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.compact.svelte-kcm7hr{grid-template-rows:32px min-content;box-shadow:none}title-area.svelte-kcm7hr{display:grid;grid-template-columns:max-content auto max-content}title-text.svelte-kcm7hr{font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}title-text.center.svelte-kcm7hr{justify-content:center}title-text.compact.svelte-kcm7hr{font-size:var(--text-size-header)}");
    }

    const get_extension_slot_changes = dirty => ({});
    const get_extension_slot_context = ctx => ({});
    const get_action_slot_changes = dirty => ({});
    const get_action_slot_context = ctx => ({});
    const get_menu_slot_changes = dirty => ({});
    const get_menu_slot_context = ctx => ({});

    // (54:26)               
    function fallback_block_1$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (60:28)               
    function fallback_block$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1f(ctx) {
    	let doric_title_bar;
    	let title_area;
    	let t0;
    	let title_text;
    	let t1;
    	let t2;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const menu_slot_template = /*#slots*/ ctx[5].menu;
    	const menu_slot = create_slot(menu_slot_template, ctx, /*$$scope*/ ctx[4], get_menu_slot_context);
    	const menu_slot_or_fallback = menu_slot || fallback_block_1$1();
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	const action_slot_template = /*#slots*/ ctx[5].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[4], get_action_slot_context);
    	const action_slot_or_fallback = action_slot || fallback_block$1();
    	const extension_slot_template = /*#slots*/ ctx[5].extension;
    	const extension_slot = create_slot(extension_slot_template, ctx, /*$$scope*/ ctx[4], get_extension_slot_context);

    	return {
    		c() {
    			doric_title_bar = element("doric-title-bar");
    			title_area = element("title-area");
    			if (menu_slot_or_fallback) menu_slot_or_fallback.c();
    			t0 = space();
    			title_text = element("title-text");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			if (action_slot_or_fallback) action_slot_or_fallback.c();
    			t2 = space();
    			if (extension_slot) extension_slot.c();
    			set_custom_element_data(title_text, "class", "svelte-kcm7hr");
    			toggle_class(title_text, "center", /*center*/ ctx[1]);
    			toggle_class(title_text, "compact", /*compact*/ ctx[2]);
    			set_custom_element_data(title_area, "class", "svelte-kcm7hr");
    			set_custom_element_data(doric_title_bar, "class", "svelte-kcm7hr");
    			toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			toggle_class(doric_title_bar, "compact", /*compact*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, doric_title_bar, anchor);
    			append(doric_title_bar, title_area);

    			if (menu_slot_or_fallback) {
    				menu_slot_or_fallback.m(title_area, null);
    			}

    			append(title_area, t0);
    			append(title_area, title_text);

    			if (default_slot) {
    				default_slot.m(title_text, null);
    			}

    			append(title_area, t1);

    			if (action_slot_or_fallback) {
    				action_slot_or_fallback.m(title_area, null);
    			}

    			append(doric_title_bar, t2);

    			if (extension_slot) {
    				extension_slot.m(doric_title_bar, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(grid_action = grid.call(null, doric_title_bar, /*$$props*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (menu_slot) {
    				if (menu_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						menu_slot,
    						menu_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(menu_slot_template, /*$$scope*/ ctx[4], dirty, get_menu_slot_changes),
    						get_menu_slot_context
    					);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*center*/ 2) {
    				toggle_class(title_text, "center", /*center*/ ctx[1]);
    			}

    			if (!current || dirty & /*compact*/ 4) {
    				toggle_class(title_text, "compact", /*compact*/ ctx[2]);
    			}

    			if (action_slot) {
    				if (action_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						action_slot,
    						action_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(action_slot_template, /*$$scope*/ ctx[4], dirty, get_action_slot_changes),
    						get_action_slot_context
    					);
    				}
    			}

    			if (extension_slot) {
    				if (extension_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						extension_slot,
    						extension_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(extension_slot_template, /*$$scope*/ ctx[4], dirty, get_extension_slot_changes),
    						get_extension_slot_context
    					);
    				}
    			}

    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 8) grid_action.update.call(null, /*$$props*/ ctx[3]);

    			if (!current || dirty & /*sticky*/ 1) {
    				toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			}

    			if (!current || dirty & /*compact*/ 4) {
    				toggle_class(doric_title_bar, "compact", /*compact*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(menu_slot_or_fallback, local);
    			transition_in(default_slot, local);
    			transition_in(action_slot_or_fallback, local);
    			transition_in(extension_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(menu_slot_or_fallback, local);
    			transition_out(default_slot, local);
    			transition_out(action_slot_or_fallback, local);
    			transition_out(extension_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_title_bar);
    			if (menu_slot_or_fallback) menu_slot_or_fallback.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (action_slot_or_fallback) action_slot_or_fallback.d(detaching);
    			if (extension_slot) extension_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$T($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { center } = $$props;
    	let { compact } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(3, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('sticky' in $$new_props) $$invalidate(0, sticky = $$new_props.sticky);
    		if ('center' in $$new_props) $$invalidate(1, center = $$new_props.center);
    		if ('compact' in $$new_props) $$invalidate(2, compact = $$new_props.compact);
    		if ('$$scope' in $$new_props) $$invalidate(4, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);
    	return [sticky, center, compact, $$props, $$scope, slots];
    }

    class Titlebar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$T, create_fragment$1f, safe_not_equal, { sticky: 0, center: 1, compact: 2 }, add_css$d);
    	}
    }

    /* core\select.svelte generated by Svelte v3.55.0 */

    function add_css$c(target) {
    	append_styles(target, "svelte-1x5uiq8", "select-layout.svelte-1x5uiq8{display:grid;flex-grow:1;grid-template-columns:24px auto;grid-template-rows:min-content auto}label-area.svelte-1x5uiq8{display:block;user-select:none;font-size:13px;grid-column:span 2;padding:2px 16px;border-bottom-right-radius:4px;width:max-content;cursor:default;border-bottom:1px solid var(--control-border);border-right:1px solid var(--control-border);color:var(--control-border)}label-area.svelte-1x5uiq8:empty{display:none}selected-area.svelte-1x5uiq8{padding:8px}");
    }

    const get_selected_slot_changes = dirty => ({ selected: dirty & /*selected*/ 128 });
    const get_selected_slot_context = ctx => ({ selected: /*selected*/ ctx[7] });
    const get_options_slot_changes = dirty => ({ info: dirty & /*info*/ 256 });
    const get_options_slot_context = ctx => ({ info: /*info*/ ctx[8] });

    // (75:4) {#if label}
    function create_if_block$b(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Titlebar({
    			props: {
    				compact: true,
    				sticky: true,
    				$$slots: {
    					extension: [create_extension_slot$3],
    					default: [create_default_slot_4$f]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope, filter, searchable, label*/ 131121) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    		}
    	};
    }

    // (76:8) <Titlebar compact sticky>
    function create_default_slot_4$f(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*label*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 1) set_data(t, /*label*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (79:16) {#if searchable}
    function create_if_block_1$5(ctx) {
    	let textinput;
    	let updating_value;
    	let current;

    	function textinput_value_binding(value) {
    		/*textinput_value_binding*/ ctx[15](value);
    	}

    	let textinput_props = { label: "Filter", adorn: true };

    	if (/*filter*/ ctx[5] !== void 0) {
    		textinput_props.value = /*filter*/ ctx[5];
    	}

    	textinput = new Text_input$1({ props: textinput_props });
    	binding_callbacks.push(() => bind(textinput, 'value', textinput_value_binding, /*filter*/ ctx[5]));

    	return {
    		c() {
    			create_component(textinput.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(textinput, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const textinput_changes = {};

    			if (!updating_value && dirty & /*filter*/ 32) {
    				updating_value = true;
    				textinput_changes.value = /*filter*/ ctx[5];
    				add_flush_callback(() => updating_value = false);
    			}

    			textinput.$set(textinput_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(textinput.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textinput.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(textinput, detaching);
    		}
    	};
    }

    // (78:12) <svelte:fragment slot="extension">
    function create_extension_slot$3(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*searchable*/ ctx[4] && create_if_block_1$5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*searchable*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*searchable*/ 16) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (85:32)           
    function fallback_block_1(ctx) {
    	let optionlist;
    	let current;
    	optionlist = new Option_list({ props: { info: /*info*/ ctx[8] } });

    	return {
    		c() {
    			create_component(optionlist.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(optionlist, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const optionlist_changes = {};
    			if (dirty & /*info*/ 256) optionlist_changes.info = /*info*/ ctx[8];
    			optionlist.$set(optionlist_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(optionlist.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(optionlist.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(optionlist, detaching);
    		}
    	};
    }

    // (74:0) <ControlDrawer {persistent} bind:this={drawer}>
    function create_default_slot_3$f(ctx) {
    	let t;
    	let current;
    	let if_block = /*label*/ ctx[0] && create_if_block$b(ctx);
    	const options_slot_template = /*#slots*/ ctx[14].options;
    	const options_slot = create_slot(options_slot_template, ctx, /*$$scope*/ ctx[17], get_options_slot_context);
    	const options_slot_or_fallback = options_slot || fallback_block_1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			if (options_slot_or_fallback) options_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);

    			if (options_slot_or_fallback) {
    				options_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*label*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*label*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$b(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (options_slot) {
    				if (options_slot.p && (!current || dirty & /*$$scope, info*/ 131328)) {
    					update_slot_base(
    						options_slot,
    						options_slot_template,
    						ctx,
    						/*$$scope*/ ctx[17],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[17])
    						: get_slot_changes(options_slot_template, /*$$scope*/ ctx[17], dirty, get_options_slot_changes),
    						get_options_slot_context
    					);
    				}
    			} else {
    				if (options_slot_or_fallback && options_slot_or_fallback.p && (!current || dirty & /*info*/ 256)) {
    					options_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(options_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(options_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			if (options_slot_or_fallback) options_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (95:8) <Text adorn>
    function create_default_slot_2$j(ctx) {
    	let icon_1;
    	let current;
    	icon_1 = new Icon({ props: { name: /*icon*/ ctx[2] } });

    	return {
    		c() {
    			create_component(icon_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 4) icon_1_changes.name = /*icon*/ ctx[2];
    			icon_1.$set(icon_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};
    }

    // (100:49)                       
    function fallback_block(ctx) {
    	let t_value = (/*selected*/ ctx[7]?.label ?? "Not Selected") + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selected*/ 128 && t_value !== (t_value = (/*selected*/ ctx[7]?.label ?? "Not Selected") + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (99:12) <Text>
    function create_default_slot_1$l(ctx) {
    	let current;
    	const selected_slot_template = /*#slots*/ ctx[14].selected;
    	const selected_slot = create_slot(selected_slot_template, ctx, /*$$scope*/ ctx[17], get_selected_slot_context);
    	const selected_slot_or_fallback = selected_slot || fallback_block(ctx);

    	return {
    		c() {
    			if (selected_slot_or_fallback) selected_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (selected_slot_or_fallback) {
    				selected_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (selected_slot) {
    				if (selected_slot.p && (!current || dirty & /*$$scope, selected*/ 131200)) {
    					update_slot_base(
    						selected_slot,
    						selected_slot_template,
    						ctx,
    						/*$$scope*/ ctx[17],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[17])
    						: get_slot_changes(selected_slot_template, /*$$scope*/ ctx[17], dirty, get_selected_slot_changes),
    						get_selected_slot_context
    					);
    				}
    			} else {
    				if (selected_slot_or_fallback && selected_slot_or_fallback.p && (!current || dirty & /*selected*/ 128)) {
    					selected_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(selected_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(selected_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (selected_slot_or_fallback) selected_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (90:0) <Button variant="outline" {...$$props} on:click={open} {disabled} control>
    function create_default_slot$w(ctx) {
    	let select_layout;
    	let label_area;
    	let t0;
    	let t1;
    	let text0;
    	let t2;
    	let selected_area;
    	let text1;
    	let current;

    	text0 = new Text$1({
    			props: {
    				adorn: true,
    				$$slots: { default: [create_default_slot_2$j] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_1$l] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			select_layout = element("select-layout");
    			label_area = element("label-area");
    			t0 = text(/*label*/ ctx[0]);
    			t1 = space();
    			create_component(text0.$$.fragment);
    			t2 = space();
    			selected_area = element("selected-area");
    			create_component(text1.$$.fragment);
    			set_custom_element_data(label_area, "class", "svelte-1x5uiq8");
    			set_custom_element_data(selected_area, "class", "svelte-1x5uiq8");
    			set_custom_element_data(select_layout, "class", "svelte-1x5uiq8");
    		},
    		m(target, anchor) {
    			insert(target, select_layout, anchor);
    			append(select_layout, label_area);
    			append(label_area, t0);
    			append(select_layout, t1);
    			mount_component(text0, select_layout, null);
    			append(select_layout, t2);
    			append(select_layout, selected_area);
    			mount_component(text1, selected_area, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*label*/ 1) set_data(t0, /*label*/ ctx[0]);
    			const text0_changes = {};

    			if (dirty & /*$$scope, icon*/ 131076) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope, selected*/ 131200) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(select_layout);
    			destroy_component(text0);
    			destroy_component(text1);
    		}
    	};
    }

    function create_fragment$1e(ctx) {
    	let controldrawer;
    	let t;
    	let button;
    	let current;

    	let controldrawer_props = {
    		persistent: /*persistent*/ ctx[1],
    		$$slots: { default: [create_default_slot_3$f] },
    		$$scope: { ctx }
    	};

    	controldrawer = new Control_drawer({ props: controldrawer_props });
    	/*controldrawer_binding*/ ctx[16](controldrawer);

    	const button_spread_levels = [
    		{ variant: "outline" },
    		/*$$props*/ ctx[10],
    		{ disabled: /*disabled*/ ctx[3] },
    		{ control: true }
    	];

    	let button_props = {
    		$$slots: { default: [create_default_slot$w] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < button_spread_levels.length; i += 1) {
    		button_props = assign(button_props, button_spread_levels[i]);
    	}

    	button = new Button({ props: button_props });
    	button.$on("click", /*open*/ ctx[9]);

    	return {
    		c() {
    			create_component(controldrawer.$$.fragment);
    			t = space();
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(controldrawer, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const controldrawer_changes = {};
    			if (dirty & /*persistent*/ 2) controldrawer_changes.persistent = /*persistent*/ ctx[1];

    			if (dirty & /*$$scope, info, filter, searchable, label*/ 131377) {
    				controldrawer_changes.$$scope = { dirty, ctx };
    			}

    			controldrawer.$set(controldrawer_changes);

    			const button_changes = (dirty & /*$$props, disabled*/ 1032)
    			? get_spread_update(button_spread_levels, [
    					button_spread_levels[0],
    					dirty & /*$$props*/ 1024 && get_spread_object(/*$$props*/ ctx[10]),
    					dirty & /*disabled*/ 8 && { disabled: /*disabled*/ ctx[3] },
    					button_spread_levels[3]
    				])
    			: {};

    			if (dirty & /*$$scope, selected, icon, label*/ 131205) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(controldrawer.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(controldrawer.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*controldrawer_binding*/ ctx[16](null);
    			destroy_component(controldrawer, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    function instance$S($$self, $$props, $$invalidate) {
    	let shown;
    	let info;
    	let selected;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { options } = $$props;
    	let { value } = $$props;
    	let { label = "" } = $$props;
    	let { persistent = false } = $$props;
    	let { icon = "caret-right" } = $$props;
    	let { disabled } = $$props;
    	let { searchable = false } = $$props;
    	let drawer = null;

    	const select = newValue => {
    		drawer.close();
    		$$invalidate(5, filter = "");
    		$$invalidate(11, value = newValue);
    	};

    	const open = () => drawer.open();
    	let filter = "";

    	function textinput_value_binding(value) {
    		filter = value;
    		$$invalidate(5, filter);
    	}

    	function controldrawer_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			drawer = $$value;
    			$$invalidate(6, drawer);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(10, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('options' in $$new_props) $$invalidate(12, options = $$new_props.options);
    		if ('value' in $$new_props) $$invalidate(11, value = $$new_props.value);
    		if ('label' in $$new_props) $$invalidate(0, label = $$new_props.label);
    		if ('persistent' in $$new_props) $$invalidate(1, persistent = $$new_props.persistent);
    		if ('icon' in $$new_props) $$invalidate(2, icon = $$new_props.icon);
    		if ('disabled' in $$new_props) $$invalidate(3, disabled = $$new_props.disabled);
    		if ('searchable' in $$new_props) $$invalidate(4, searchable = $$new_props.searchable);
    		if ('$$scope' in $$new_props) $$invalidate(17, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options, filter*/ 4128) {
    			$$invalidate(13, shown = options.filter(opt => opt.label.toLowerCase().includes(filter.toLowerCase())));
    		}

    		if ($$self.$$.dirty & /*shown, value*/ 10240) {
    			$$invalidate(8, info = {
    				select,
    				options: shown,
    				currentValue: value
    			});
    		}

    		if ($$self.$$.dirty & /*options, value*/ 6144) {
    			$$invalidate(7, selected = options.find(option => option.value === value));
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		label,
    		persistent,
    		icon,
    		disabled,
    		searchable,
    		filter,
    		drawer,
    		selected,
    		info,
    		open,
    		$$props,
    		value,
    		options,
    		shown,
    		slots,
    		textinput_value_binding,
    		controldrawer_binding,
    		$$scope
    	];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$S,
    			create_fragment$1e,
    			safe_not_equal,
    			{
    				options: 12,
    				value: 11,
    				label: 0,
    				persistent: 1,
    				icon: 2,
    				disabled: 3,
    				searchable: 4
    			},
    			add_css$c
    		);
    	}
    }

    /* core\table\body.svelte generated by Svelte v3.55.0 */

    function add_css$b(target) {
    	append_styles(target, "svelte-mqbdtm", "table-cell.svelte-mqbdtm{align-items:center;display:flex;position:relative;user-select:none;overflow:hidden}table-row.svelte-mqbdtm{display:grid;height:40px;padding:8px;background-color:var(--layer-background);grid-template-columns:var(--col-template)}table-row.svelte-mqbdtm:nth-child(2n){background-color:var(--background)}");
    }

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (33:8) {#if item !== undefined}
    function create_if_block$a(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*cols*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*cols, items*/ 3) {
    				each_value_1 = /*cols*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (34:12) {#each cols as col}
    function create_each_block_1$3(ctx) {
    	let table_cell;
    	let t0_value = /*col*/ ctx[5].value(/*item*/ ctx[2]) + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			table_cell = element("table-cell");
    			t0 = text(t0_value);
    			t1 = space();
    			set_custom_element_data(table_cell, "class", "svelte-mqbdtm");
    		},
    		m(target, anchor) {
    			insert(target, table_cell, anchor);
    			append(table_cell, t0);
    			append(table_cell, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*cols, items*/ 3 && t0_value !== (t0_value = /*col*/ ctx[5].value(/*item*/ ctx[2]) + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(table_cell);
    		}
    	};
    }

    // (31:0) {#each items as item}
    function create_each_block$6(ctx) {
    	let table_row;
    	let t;
    	let if_block = /*item*/ ctx[2] !== undefined && create_if_block$a(ctx);

    	return {
    		c() {
    			table_row = element("table-row");
    			if (if_block) if_block.c();
    			t = space();
    			set_custom_element_data(table_row, "class", "svelte-mqbdtm");
    		},
    		m(target, anchor) {
    			insert(target, table_row, anchor);
    			if (if_block) if_block.m(table_row, null);
    			append(table_row, t);
    		},
    		p(ctx, dirty) {
    			if (/*item*/ ctx[2] !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$a(ctx);
    					if_block.c();
    					if_block.m(table_row, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(table_row);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function create_fragment$1d(ctx) {
    	let each_1_anchor;
    	let each_value = /*items*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*cols, items, undefined*/ 3) {
    				each_value = /*items*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$R($$self, $$props, $$invalidate) {
    	let { cols } = $$props;
    	let { items } = $$props;

    	$$self.$$set = $$props => {
    		if ('cols' in $$props) $$invalidate(0, cols = $$props.cols);
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    	};

    	return [cols, items];
    }

    class Body extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$R, create_fragment$1d, safe_not_equal, { cols: 0, items: 1 }, add_css$b);
    	}
    }

    /* core\table\header.svelte generated by Svelte v3.55.0 */

    function add_css$a(target) {
    	append_styles(target, "svelte-1v7y6dw", "table-header.svelte-1v7y6dw{display:grid;font-weight:700;height:48px;padding:8px;position:sticky;top:0px;user-select:none;z-index:+1;grid-template-columns:var(--col-template);background-color:var(--primary);color:var(--text-invert);font-size:var(--text-size-header)}header-item.svelte-1v7y6dw{align-items:center;display:flex}");
    }

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (30:4) {#each cols as col}
    function create_each_block$5(ctx) {
    	let header_item;
    	let t0_value = /*col*/ ctx[1].label + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			header_item = element("header-item");
    			t0 = text(t0_value);
    			t1 = space();
    			set_custom_element_data(header_item, "class", "svelte-1v7y6dw");
    		},
    		m(target, anchor) {
    			insert(target, header_item, anchor);
    			append(header_item, t0);
    			append(header_item, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*cols*/ 1 && t0_value !== (t0_value = /*col*/ ctx[1].label + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(header_item);
    		}
    	};
    }

    function create_fragment$1c(ctx) {
    	let table_header;
    	let each_value = /*cols*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	return {
    		c() {
    			table_header = element("table-header");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(table_header, "class", "svelte-1v7y6dw");
    		},
    		m(target, anchor) {
    			insert(target, table_header, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table_header, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*cols*/ 1) {
    				each_value = /*cols*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table_header, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(table_header);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$Q($$self, $$props, $$invalidate) {
    	let { cols } = $$props;

    	$$self.$$set = $$props => {
    		if ('cols' in $$props) $$invalidate(0, cols = $$props.cols);
    	};

    	return [cols];
    }

    class Header extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$Q, create_fragment$1c, safe_not_equal, { cols: 0 }, add_css$a);
    	}
    }

    /* core\table.svelte generated by Svelte v3.55.0 */

    function add_css$9(target) {
    	append_styles(target, "svelte-zmj36j", "doric-table.svelte-zmj36j{display:grid;overflow:hidden}");
    }

    function create_fragment$1b(ctx) {
    	let doric_table;
    	let list;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;

    	list = new List$1({
    			props: {
    				area: /*area*/ ctx[2],
    				col: /*col*/ ctx[3],
    				row: /*row*/ ctx[4],
    				data: /*data*/ ctx[0],
    				pageSize: /*pageSize*/ ctx[1],
    				body: Body,
    				cols: /*columns*/ ctx[5],
    				header: Header
    			}
    		});

    	return {
    		c() {
    			doric_table = element("doric-table");
    			create_component(list.$$.fragment);
    			set_custom_element_data(doric_table, "class", "svelte-zmj36j");
    		},
    		m(target, anchor) {
    			insert(target, doric_table, anchor);
    			mount_component(list, doric_table, null);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_table, /*tableVars*/ ctx[6]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const list_changes = {};
    			if (dirty & /*area*/ 4) list_changes.area = /*area*/ ctx[2];
    			if (dirty & /*col*/ 8) list_changes.col = /*col*/ ctx[3];
    			if (dirty & /*row*/ 16) list_changes.row = /*row*/ ctx[4];
    			if (dirty & /*data*/ 1) list_changes.data = /*data*/ ctx[0];
    			if (dirty & /*pageSize*/ 2) list_changes.pageSize = /*pageSize*/ ctx[1];
    			if (dirty & /*columns*/ 32) list_changes.cols = /*columns*/ ctx[5];
    			list.$set(list_changes);
    			if (vars_action && is_function(vars_action.update) && dirty & /*tableVars*/ 64) vars_action.update.call(null, /*tableVars*/ ctx[6]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_table);
    			destroy_component(list);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const processCol = col => {
    	const { value, ...rest } = col;

    	return {
    		...rest,
    		value: typeof value === "function"
    		? value
    		: item => item[value]
    	};
    };

    function instance$P($$self, $$props, $$invalidate) {
    	let columns;
    	let tableVars;
    	let { cols = null } = $$props;
    	let { data } = $$props;
    	let { pageSize } = $$props;
    	let { rowHeight = "40px" } = $$props;
    	let { area } = $$props;
    	let { col } = $$props;
    	let { row } = $$props;

    	$$self.$$set = $$props => {
    		if ('cols' in $$props) $$invalidate(7, cols = $$props.cols);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('pageSize' in $$props) $$invalidate(1, pageSize = $$props.pageSize);
    		if ('rowHeight' in $$props) $$invalidate(8, rowHeight = $$props.rowHeight);
    		if ('area' in $$props) $$invalidate(2, area = $$props.area);
    		if ('col' in $$props) $$invalidate(3, col = $$props.col);
    		if ('row' in $$props) $$invalidate(4, row = $$props.row);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*cols, data*/ 129) {
    			$$invalidate(5, columns = cols?.map(processCol) ?? Object.keys(data[0]).map(key => ({ value: item => item[key], label: key })));
    		}

    		if ($$self.$$.dirty & /*columns, rowHeight*/ 288) {
    			$$invalidate(6, tableVars = {
    				"col-template": columns.map(col => col.size ?? "1fr").join(" "),
    				"row": rowHeight
    			});
    		}
    	};

    	return [data, pageSize, area, col, row, columns, tableVars, cols, rowHeight];
    }

    class Table$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$P,
    			create_fragment$1b,
    			safe_not_equal,
    			{
    				cols: 7,
    				data: 0,
    				pageSize: 1,
    				rowHeight: 8,
    				area: 2,
    				col: 3,
    				row: 4
    			},
    			add_css$9
    		);
    	}
    }

    /* core\tab-panel.svelte generated by Svelte v3.55.0 */

    function add_css$8(target) {
    	append_styles(target, "svelte-1shybe8", "tab-panel.svelte-1shybe8{display:none}tab-panel.active.svelte-1shybe8{display:block}");
    }

    function create_fragment$1a(ctx) {
    	let tab_panel;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			tab_panel = element("tab-panel");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(tab_panel, "class", "svelte-1shybe8");
    			toggle_class(tab_panel, "active", /*tabGroup*/ ctx[0] === /*value*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, tab_panel, anchor);

    			if (default_slot) {
    				default_slot.m(tab_panel, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(grid_action = grid.call(null, tab_panel, /*$$props*/ ctx[2]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
    				}
    			}

    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 4) grid_action.update.call(null, /*$$props*/ ctx[2]);

    			if (!current || dirty & /*tabGroup, value*/ 3) {
    				toggle_class(tab_panel, "active", /*tabGroup*/ ctx[0] === /*value*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tab_panel);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$O($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { tabGroup } = $$props;
    	let { value } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(2, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('tabGroup' in $$new_props) $$invalidate(0, tabGroup = $$new_props.tabGroup);
    		if ('value' in $$new_props) $$invalidate(1, value = $$new_props.value);
    		if ('$$scope' in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);
    	return [tabGroup, value, $$props, $$scope, slots];
    }

    class Tab_panel extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$O, create_fragment$1a, safe_not_equal, { tabGroup: 0, value: 1 }, add_css$8);
    	}
    }

    /* core\tabs.svelte generated by Svelte v3.55.0 */

    function add_css$7(target) {
    	append_styles(target, "svelte-qa6wbj", "doric-tabs.svelte-qa6wbj.svelte-qa6wbj{position:relative;display:grid;grid-template-columns:repeat(var(--tabs), 1fr);background-color:var(--card-background);color:var(--text-normal);overflow:hidden}doric-tabs.vertical.svelte-qa6wbj.svelte-qa6wbj{grid-template-columns:1fr;grid-template-rows:repeat(var(--tabs), 1fr)}doric-tabs.scrollable.svelte-qa6wbj.svelte-qa6wbj{overflow:auto}tab-item.svelte-qa6wbj.svelte-qa6wbj{display:grid;border-width:0px;border-bottom-width:2px;border-style:solid;border-color:transparent;user-select:none}tab-item.selected.svelte-qa6wbj.svelte-qa6wbj{color:var(--primary);border-color:var(--primary)}.fill-selected.svelte-qa6wbj tab-item.selected.svelte-qa6wbj{color:var(--text-invert);background-color:var(--primary)}.vertical.svelte-qa6wbj tab-item.svelte-qa6wbj{border-bottom-width:0px;border-right-width:2px}tab-label.svelte-qa6wbj.svelte-qa6wbj{display:flex;align-items:center;justify-content:center;padding:8px 12px;font-size:var(--text-sixe-header)}tab-label.vertical.svelte-qa6wbj.svelte-qa6wbj{flex-direction:column}");
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (100:20) {#if option.icon}
    function create_if_block$9(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: /*option*/ ctx[13].icon } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*options*/ 16) icon_changes.name = /*option*/ ctx[13].icon;
    			icon.$set(icon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (98:12) <ActionArea on:click={change(option.value)}>
    function create_default_slot$v(ctx) {
    	let tab_label;
    	let t0;
    	let span;
    	let t1_value = /*option*/ ctx[13].label + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[13].icon && create_if_block$9(ctx);

    	return {
    		c() {
    			tab_label = element("tab-label");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			set_custom_element_data(tab_label, "class", "svelte-qa6wbj");
    			toggle_class(tab_label, "vertical", /*iconTop*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, tab_label, anchor);
    			if (if_block) if_block.m(tab_label, null);
    			append(tab_label, t0);
    			append(tab_label, span);
    			append(span, t1);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*option*/ ctx[13].icon) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*options*/ 16) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$9(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(tab_label, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*options*/ 16) && t1_value !== (t1_value = /*option*/ ctx[13].label + "")) set_data(t1, t1_value);

    			if (!current || dirty & /*iconTop*/ 8) {
    				toggle_class(tab_label, "vertical", /*iconTop*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tab_label);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (96:4) {#each options as option (option.value)}
    function create_each_block$4(key_1, ctx) {
    	let tab_item;
    	let actionarea;
    	let t;
    	let current;

    	actionarea = new Action_area$1({
    			props: {
    				$$slots: { default: [create_default_slot$v] },
    				$$scope: { ctx }
    			}
    		});

    	actionarea.$on("click", function () {
    		if (is_function(/*change*/ ctx[9](/*option*/ ctx[13].value))) /*change*/ ctx[9](/*option*/ ctx[13].value).apply(this, arguments);
    	});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tab_item = element("tab-item");
    			create_component(actionarea.$$.fragment);
    			t = space();
    			set_custom_element_data(tab_item, "class", "svelte-qa6wbj");
    			toggle_class(tab_item, "selected", /*option*/ ctx[13].value === /*tabGroup*/ ctx[0]);
    			this.first = tab_item;
    		},
    		m(target, anchor) {
    			insert(target, tab_item, anchor);
    			mount_component(actionarea, tab_item, null);
    			append(tab_item, t);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const actionarea_changes = {};

    			if (dirty & /*$$scope, iconTop, options*/ 65560) {
    				actionarea_changes.$$scope = { dirty, ctx };
    			}

    			actionarea.$set(actionarea_changes);

    			if (!current || dirty & /*options, tabGroup*/ 17) {
    				toggle_class(tab_item, "selected", /*option*/ ctx[13].value === /*tabGroup*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionarea.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionarea.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tab_item);
    			destroy_component(actionarea);
    		}
    	};
    }

    function create_fragment$19(ctx) {
    	let doric_tabs;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[4];
    	const get_key = ctx => /*option*/ ctx[13].value;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	return {
    		c() {
    			doric_tabs = element("doric-tabs");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(doric_tabs, "class", "svelte-qa6wbj");
    			toggle_class(doric_tabs, "vertical", /*vertical*/ ctx[6]);
    			toggle_class(doric_tabs, "scrollable", /*scrollable*/ ctx[5]);
    			toggle_class(doric_tabs, "fill-selected", /*fillSelected*/ ctx[2]);
    			toggle_class(doric_tabs, "ignore-appbar-reskin", /*adorn*/ ctx[1] === "no-reskin");
    		},
    		m(target, anchor) {
    			insert(target, doric_tabs, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(doric_tabs, null);
    			}

    			/*doric_tabs_binding*/ ctx[12](doric_tabs);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, doric_tabs, /*tabCount*/ ctx[8])),
    					action_destroyer(grid_action = grid.call(null, doric_tabs, /*$$props*/ ctx[10]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*options, tabGroup, change, iconTop*/ 537) {
    				each_value = /*options*/ ctx[4];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, doric_tabs, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
    				check_outros();
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*tabCount*/ 256) vars_action.update.call(null, /*tabCount*/ ctx[8]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 1024) grid_action.update.call(null, /*$$props*/ ctx[10]);

    			if (!current || dirty & /*vertical*/ 64) {
    				toggle_class(doric_tabs, "vertical", /*vertical*/ ctx[6]);
    			}

    			if (!current || dirty & /*scrollable*/ 32) {
    				toggle_class(doric_tabs, "scrollable", /*scrollable*/ ctx[5]);
    			}

    			if (!current || dirty & /*fillSelected*/ 4) {
    				toggle_class(doric_tabs, "fill-selected", /*fillSelected*/ ctx[2]);
    			}

    			if (!current || dirty & /*adorn*/ 2) {
    				toggle_class(doric_tabs, "ignore-appbar-reskin", /*adorn*/ ctx[1] === "no-reskin");
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_tabs);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*doric_tabs_binding*/ ctx[12](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$N($$self, $$props, $$invalidate) {
    	let tabCount;
    	let { adorn } = $$props;
    	let { fillSelected = false } = $$props;
    	let { iconTop = false } = $$props;
    	let { options } = $$props;
    	let { scrollable = false } = $$props;
    	let { scrollToSelected = false } = $$props;
    	let { tabGroup } = $$props;
    	let { vertical } = $$props;
    	const change = value => () => $$invalidate(0, tabGroup = value);
    	let tabParent = null;

    	onMount(() => {
    		if (scrollToSelected === false) {
    			return;
    		}

    		const item = tabParent.querySelector(".selected");
    		const direction = vertical ? "Top" : "Left";
    		$$invalidate(7, tabParent[`scroll${direction}`] = item[`offset${direction}`], tabParent);
    	});

    	function doric_tabs_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			tabParent = $$value;
    			$$invalidate(7, tabParent);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(10, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('adorn' in $$new_props) $$invalidate(1, adorn = $$new_props.adorn);
    		if ('fillSelected' in $$new_props) $$invalidate(2, fillSelected = $$new_props.fillSelected);
    		if ('iconTop' in $$new_props) $$invalidate(3, iconTop = $$new_props.iconTop);
    		if ('options' in $$new_props) $$invalidate(4, options = $$new_props.options);
    		if ('scrollable' in $$new_props) $$invalidate(5, scrollable = $$new_props.scrollable);
    		if ('scrollToSelected' in $$new_props) $$invalidate(11, scrollToSelected = $$new_props.scrollToSelected);
    		if ('tabGroup' in $$new_props) $$invalidate(0, tabGroup = $$new_props.tabGroup);
    		if ('vertical' in $$new_props) $$invalidate(6, vertical = $$new_props.vertical);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 16) {
    			$$invalidate(8, tabCount = { tabs: options.length });
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		tabGroup,
    		adorn,
    		fillSelected,
    		iconTop,
    		options,
    		scrollable,
    		vertical,
    		tabParent,
    		tabCount,
    		change,
    		$$props,
    		scrollToSelected,
    		doric_tabs_binding
    	];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$N,
    			create_fragment$19,
    			safe_not_equal,
    			{
    				adorn: 1,
    				fillSelected: 2,
    				iconTop: 3,
    				options: 4,
    				scrollable: 5,
    				scrollToSelected: 11,
    				tabGroup: 0,
    				vertical: 6
    			},
    			add_css$7
    		);
    	}
    }

    /* core\toggle.svelte generated by Svelte v3.55.0 */

    function add_css$6(target) {
    	append_styles(target, "svelte-1dte0b6", "doric-toggle.svelte-1dte0b6{display:grid;user-select:none}.disabled.svelte-1dte0b6{opacity:0.5}.left.svelte-1dte0b6{grid-template-columns:max-content 1fr;grid-template-areas:\"icon label\"}.right.svelte-1dte0b6{grid-template-columns:1fr max-content;grid-template-areas:\"label icon\"}.top.svelte-1dte0b6{grid-template-rows:max-content 1fr;grid-template-areas:\"icon\" \"label\"}.bottom.svelte-1dte0b6{grid-template-rows:1fr max-content;grid-template-areas:\"label\" \"icon\"}icon-area.svelte-1dte0b6{display:flex;align-items:center;justify-items:center;grid-area:icon;padding:4px;font-size:20px;transition:color 200ms linear;color:var(--icon-color);--icon-color:inherit}icon-area.on[color=\"primary\"].svelte-1dte0b6{--icon-color:var(--primary)}icon-area.on[color=\"secondary\"].svelte-1dte0b6{--icon-color:var(--secondary)}icon-area.on[color=\"danger\"].svelte-1dte0b6{--icon-color:var(--danger)}label-area.svelte-1dte0b6{display:flex;align-items:center;grid-area:label;padding:4px}");
    }

    // (93:12) {:else}
    function create_else_block$5(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[15].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[16],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[16])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (91:12) {#if label}
    function create_if_block$8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*label*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 16) set_data(t, /*label*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (85:0) <ActionArea {disabled} on:click={toggle} {area} {col} {row}>
    function create_default_slot$u(ctx) {
    	let doric_toggle;
    	let icon_area;
    	let icon_1;
    	let t;
    	let label_area;
    	let current_block_type_index;
    	let if_block;
    	let doric_toggle_class_value;
    	let current;
    	icon_1 = new Icon({ props: { name: /*icon*/ ctx[9] } });
    	const if_block_creators = [create_if_block$8, create_else_block$5];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*label*/ ctx[4]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			doric_toggle = element("doric-toggle");
    			icon_area = element("icon-area");
    			create_component(icon_1.$$.fragment);
    			t = space();
    			label_area = element("label-area");
    			if_block.c();
    			set_custom_element_data(icon_area, "color", /*color*/ ctx[2]);
    			set_custom_element_data(icon_area, "class", "svelte-1dte0b6");
    			toggle_class(icon_area, "on", /*on*/ ctx[0]);
    			set_custom_element_data(label_area, "class", "svelte-1dte0b6");
    			set_custom_element_data(doric_toggle, "class", doric_toggle_class_value = "" + (null_to_empty(/*iconpos*/ ctx[5]) + " svelte-1dte0b6"));
    			toggle_class(doric_toggle, "checkbox", /*checkbox*/ ctx[1]);
    			toggle_class(doric_toggle, "disabled", /*disabled*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, doric_toggle, anchor);
    			append(doric_toggle, icon_area);
    			mount_component(icon_1, icon_area, null);
    			append(doric_toggle, t);
    			append(doric_toggle, label_area);
    			if_blocks[current_block_type_index].m(label_area, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 512) icon_1_changes.name = /*icon*/ ctx[9];
    			icon_1.$set(icon_1_changes);

    			if (!current || dirty & /*color*/ 4) {
    				set_custom_element_data(icon_area, "color", /*color*/ ctx[2]);
    			}

    			if (!current || dirty & /*on*/ 1) {
    				toggle_class(icon_area, "on", /*on*/ ctx[0]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(label_area, null);
    			}

    			if (!current || dirty & /*iconpos*/ 32 && doric_toggle_class_value !== (doric_toggle_class_value = "" + (null_to_empty(/*iconpos*/ ctx[5]) + " svelte-1dte0b6"))) {
    				set_custom_element_data(doric_toggle, "class", doric_toggle_class_value);
    			}

    			if (!current || dirty & /*iconpos, checkbox*/ 34) {
    				toggle_class(doric_toggle, "checkbox", /*checkbox*/ ctx[1]);
    			}

    			if (!current || dirty & /*iconpos, disabled*/ 40) {
    				toggle_class(doric_toggle, "disabled", /*disabled*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_toggle);
    			destroy_component(icon_1);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function create_fragment$18(ctx) {
    	let actionarea;
    	let current;

    	actionarea = new Action_area$1({
    			props: {
    				disabled: /*disabled*/ ctx[3],
    				area: /*area*/ ctx[6],
    				col: /*col*/ ctx[7],
    				row: /*row*/ ctx[8],
    				$$slots: { default: [create_default_slot$u] },
    				$$scope: { ctx }
    			}
    		});

    	actionarea.$on("click", /*toggle*/ ctx[10]);

    	return {
    		c() {
    			create_component(actionarea.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(actionarea, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const actionarea_changes = {};
    			if (dirty & /*disabled*/ 8) actionarea_changes.disabled = /*disabled*/ ctx[3];
    			if (dirty & /*area*/ 64) actionarea_changes.area = /*area*/ ctx[6];
    			if (dirty & /*col*/ 128) actionarea_changes.col = /*col*/ ctx[7];
    			if (dirty & /*row*/ 256) actionarea_changes.row = /*row*/ ctx[8];

    			if (dirty & /*$$scope, iconpos, checkbox, disabled, label, color, on, icon*/ 66111) {
    				actionarea_changes.$$scope = { dirty, ctx };
    			}

    			actionarea.$set(actionarea_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionarea.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionarea.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(actionarea, detaching);
    		}
    	};
    }

    function instance$M($$self, $$props, $$invalidate) {
    	let icon_on;
    	let icon_off;
    	let icon;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { checkbox } = $$props;
    	let { color } = $$props;
    	let { disabled } = $$props;
    	let { label } = $$props;
    	let { iconpos = "left" } = $$props;
    	let { on } = $$props;
    	let { onIcon } = $$props;
    	let { offIcon } = $$props;
    	let { area } = $$props;
    	let { col } = $$props;
    	let { row } = $$props;

    	const toggle = () => {
    		if (disabled === true) {
    			return;
    		}

    		$$invalidate(0, on = on === false);
    	};

    	$$self.$$set = $$props => {
    		if ('checkbox' in $$props) $$invalidate(1, checkbox = $$props.checkbox);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('disabled' in $$props) $$invalidate(3, disabled = $$props.disabled);
    		if ('label' in $$props) $$invalidate(4, label = $$props.label);
    		if ('iconpos' in $$props) $$invalidate(5, iconpos = $$props.iconpos);
    		if ('on' in $$props) $$invalidate(0, on = $$props.on);
    		if ('onIcon' in $$props) $$invalidate(11, onIcon = $$props.onIcon);
    		if ('offIcon' in $$props) $$invalidate(12, offIcon = $$props.offIcon);
    		if ('area' in $$props) $$invalidate(6, area = $$props.area);
    		if ('col' in $$props) $$invalidate(7, col = $$props.col);
    		if ('row' in $$props) $$invalidate(8, row = $$props.row);
    		if ('$$scope' in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*onIcon, checkbox*/ 2050) {
    			$$invalidate(14, icon_on = onIcon ?? (checkbox ? "square-check" : "toggle-on"));
    		}

    		if ($$self.$$.dirty & /*offIcon, checkbox*/ 4098) {
    			$$invalidate(13, icon_off = offIcon ?? (checkbox ? "regular:square" : "toggle-off"));
    		}

    		if ($$self.$$.dirty & /*on, icon_on, icon_off*/ 24577) {
    			$$invalidate(9, icon = on ? icon_on : icon_off);
    		}
    	};

    	return [
    		on,
    		checkbox,
    		color,
    		disabled,
    		label,
    		iconpos,
    		area,
    		col,
    		row,
    		icon,
    		toggle,
    		onIcon,
    		offIcon,
    		icon_off,
    		icon_on,
    		slots,
    		$$scope
    	];
    }

    class Toggle extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$M,
    			create_fragment$18,
    			safe_not_equal,
    			{
    				checkbox: 1,
    				color: 2,
    				disabled: 3,
    				label: 4,
    				iconpos: 5,
    				on: 0,
    				onIcon: 11,
    				offIcon: 12,
    				area: 6,
    				col: 7,
    				row: 8
    			},
    			add_css$6
    		);
    	}
    }

    /* core\layout\grid.svelte generated by Svelte v3.55.0 */

    function add_css$5(target) {
    	append_styles(target, "svelte-b0hzoo", "grid-layout.svelte-b0hzoo{display:grid;overflow:hidden;padding:var(--padding);gap:var(--gap);grid-auto-flow:var(--direction);grid-template-columns:var(--cols);grid-template-rows:var(--rows);grid-template-areas:var(--areas);grid-auto-columns:var(--autoCols);grid-auto-rows:var(--autoRows)}.scrollable.svelte-b0hzoo{overflow:auto;-webkit-overflow-scrolling:touch;height:100%;scroll-behavior:auto}.overflow.svelte-b0hzoo{overflow:visible}.fit.svelte-b0hzoo{max-height:100%}");
    }

    function create_fragment$17(ctx) {
    	let grid_layout;
    	let vars_action;
    	let grid_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[15].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

    	return {
    		c() {
    			grid_layout = element("grid-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(grid_layout, "class", "svelte-b0hzoo");
    			toggle_class(grid_layout, "scrollable", /*scrollable*/ ctx[3]);
    			toggle_class(grid_layout, "overflow", /*overflow*/ ctx[2]);
    			toggle_class(grid_layout, "fit", /*fit*/ ctx[1]);
    			toggle_class(grid_layout, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    		},
    		m(target, anchor) {
    			insert(target, grid_layout, anchor);

    			if (default_slot) {
    				default_slot.m(grid_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(vars_action = vars.call(null, grid_layout, /*flowVars*/ ctx[4])),
    					action_destroyer(grid_action = grid.call(null, grid_layout, /*$$props*/ ctx[5]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16384)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[14],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[14])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, null),
    						null
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*flowVars*/ 16) vars_action.update.call(null, /*flowVars*/ ctx[4]);
    			if (grid_action && is_function(grid_action.update) && dirty & /*$$props*/ 32) grid_action.update.call(null, /*$$props*/ ctx[5]);

    			if (!current || dirty & /*scrollable*/ 8) {
    				toggle_class(grid_layout, "scrollable", /*scrollable*/ ctx[3]);
    			}

    			if (!current || dirty & /*overflow*/ 4) {
    				toggle_class(grid_layout, "overflow", /*overflow*/ ctx[2]);
    			}

    			if (!current || dirty & /*fit*/ 2) {
    				toggle_class(grid_layout, "fit", /*fit*/ ctx[1]);
    			}

    			if (!current || dirty & /*adorn*/ 1) {
    				toggle_class(grid_layout, "ignore-appbar-reskin", /*adorn*/ ctx[0] === "no-reskin");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(grid_layout);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$L($$self, $$props, $$invalidate) {
    	let flowVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { adorn } = $$props;
    	let { areas = "initial" } = $$props;
    	let { autoCols = "initial" } = $$props;
    	let { autoRows = "initial" } = $$props;
    	let { cols = "initial" } = $$props;
    	let { direction = "row" } = $$props;
    	let { gap = "4px" } = $$props;
    	let { fit } = $$props;
    	let { overflow = false } = $$props;
    	let { padding = "4px" } = $$props;
    	let { rows = "initial" } = $$props;
    	let { scrollable = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('adorn' in $$new_props) $$invalidate(0, adorn = $$new_props.adorn);
    		if ('areas' in $$new_props) $$invalidate(6, areas = $$new_props.areas);
    		if ('autoCols' in $$new_props) $$invalidate(7, autoCols = $$new_props.autoCols);
    		if ('autoRows' in $$new_props) $$invalidate(8, autoRows = $$new_props.autoRows);
    		if ('cols' in $$new_props) $$invalidate(9, cols = $$new_props.cols);
    		if ('direction' in $$new_props) $$invalidate(10, direction = $$new_props.direction);
    		if ('gap' in $$new_props) $$invalidate(11, gap = $$new_props.gap);
    		if ('fit' in $$new_props) $$invalidate(1, fit = $$new_props.fit);
    		if ('overflow' in $$new_props) $$invalidate(2, overflow = $$new_props.overflow);
    		if ('padding' in $$new_props) $$invalidate(12, padding = $$new_props.padding);
    		if ('rows' in $$new_props) $$invalidate(13, rows = $$new_props.rows);
    		if ('scrollable' in $$new_props) $$invalidate(3, scrollable = $$new_props.scrollable);
    		if ('$$scope' in $$new_props) $$invalidate(14, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction, padding, gap, cols, rows, autoCols, autoRows, areas*/ 16320) {
    			$$invalidate(4, flowVars = {
    				direction,
    				padding,
    				gap,
    				cols,
    				rows,
    				autoCols,
    				autoRows,
    				areas: Array.isArray(areas)
    				? areas.map(line => `"${line}"`).join("\n")
    				: areas
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		adorn,
    		fit,
    		overflow,
    		scrollable,
    		flowVars,
    		$$props,
    		areas,
    		autoCols,
    		autoRows,
    		cols,
    		direction,
    		gap,
    		padding,
    		rows,
    		$$scope,
    		slots
    	];
    }

    class Grid extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$L,
    			create_fragment$17,
    			safe_not_equal,
    			{
    				adorn: 0,
    				areas: 6,
    				autoCols: 7,
    				autoRows: 8,
    				cols: 9,
    				direction: 10,
    				gap: 11,
    				fit: 1,
    				overflow: 2,
    				padding: 12,
    				rows: 13,
    				scrollable: 3
    			},
    			add_css$5
    		);
    	}
    }

    /* core\dialog\content.svelte generated by Svelte v3.55.0 */

    function add_css$4(target) {
    	append_styles(target, "svelte-1n2khek", "dialog-content.svelte-1n2khek{display:grid;position:absolute;top:var(--top);left:var(--left);transform:translate(\r\n            calc(var(--originX) * -1),\r\n            calc(var(--originY) * -1)\r\n        );width:var(--width);height:var(--height)}");
    }

    function create_fragment$16(ctx) {
    	let dialog_content;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	return {
    		c() {
    			dialog_content = element("dialog-content");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(dialog_content, "class", "svelte-1n2khek");
    		},
    		m(target, anchor) {
    			insert(target, dialog_content, anchor);

    			if (default_slot) {
    				default_slot.m(dialog_content, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, dialog_content, /*position*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, null),
    						null
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*position*/ 1) vars_action.update.call(null, /*position*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(dialog_content);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$K($$self, $$props, $$invalidate) {
    	let position;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { top = "0%" } = $$props;
    	let { left = "0%" } = $$props;
    	let { originX = "0%" } = $$props;
    	let { originY = "0%" } = $$props;
    	let { width = "" } = $$props;
    	let { height = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ('top' in $$props) $$invalidate(1, top = $$props.top);
    		if ('left' in $$props) $$invalidate(2, left = $$props.left);
    		if ('originX' in $$props) $$invalidate(3, originX = $$props.originX);
    		if ('originY' in $$props) $$invalidate(4, originY = $$props.originY);
    		if ('width' in $$props) $$invalidate(5, width = $$props.width);
    		if ('height' in $$props) $$invalidate(6, height = $$props.height);
    		if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*top, left, originX, originY, width, height*/ 126) {
    			$$invalidate(0, position = {
    				top,
    				left,
    				originX,
    				originY,
    				width,
    				height
    			});
    		}
    	};

    	return [position, top, left, originX, originY, width, height, $$scope, slots];
    }

    class Content extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$K,
    			create_fragment$16,
    			safe_not_equal,
    			{
    				top: 1,
    				left: 2,
    				originX: 3,
    				originY: 4,
    				width: 5,
    				height: 6
    			},
    			add_css$4
    		);
    	}
    }

    /* core\dialog\alert.svelte generated by Svelte v3.55.0 */

    function create_default_slot_5$d(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*message*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*message*/ 2) set_data(t, /*message*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (23:4) <Paper card>
    function create_default_slot_4$e(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_5$d] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope, message*/ 66) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (25:12) {#if title}
    function create_if_block$7(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Titlebar({
    			props: {
    				compact: true,
    				$$slots: { default: [create_default_slot_3$e] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope, title, icon*/ 73) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    		}
    	};
    }

    // (27:20) {#if icon}
    function create_if_block_1$4(ctx) {
    	let icon_1;
    	let current;
    	icon_1 = new Icon({ props: { name: /*icon*/ ctx[3] } });

    	return {
    		c() {
    			create_component(icon_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 8) icon_1_changes.name = /*icon*/ ctx[3];
    			icon_1.$set(icon_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};
    }

    // (26:16) <Titlebar compact>
    function create_default_slot_3$e(ctx) {
    	let t0;
    	let t1;
    	let current;
    	let if_block = /*icon*/ ctx[3] && create_if_block_1$4(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(/*title*/ ctx[0]);
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*icon*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*icon*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*title*/ 1) set_data(t1, /*title*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (24:8) <svelte:fragment slot="title">
    function create_title_slot$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*title*/ ctx[0] && create_if_block$7(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*title*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (38:12) <Button color="secondary" on:click={ok}>
    function create_default_slot_2$i(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*okText*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*okText*/ 4) set_data(t, /*okText*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (37:8) <Grid slot="action" cols="1fr">
    function create_default_slot_1$k(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_2$i] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*ok*/ ctx[4]);

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope, okText*/ 68) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (37:8) 
    function create_action_slot$8(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				slot: "action",
    				cols: "1fr",
    				$$slots: { default: [create_default_slot_1$k] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(grid.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, okText*/ 68) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};
    }

    // (22:0) <DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    function create_default_slot$t(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					action: [create_action_slot$8],
    					title: [create_title_slot$6],
    					default: [create_default_slot_4$e]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, okText, title, icon, message*/ 79) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    function create_fragment$15(ctx) {
    	let dialogcontent;
    	let current;

    	dialogcontent = new Content({
    			props: {
    				top: "25%",
    				left: "50%",
    				originX: "50%",
    				width: "min(70vw, 320px)",
    				$$slots: { default: [create_default_slot$t] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(dialogcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(dialogcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const dialogcontent_changes = {};

    			if (dirty & /*$$scope, okText, title, icon, message*/ 79) {
    				dialogcontent_changes.$$scope = { dirty, ctx };
    			}

    			dialogcontent.$set(dialogcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dialogcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dialogcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(dialogcontent, detaching);
    		}
    	};
    }

    function instance$J($$self, $$props, $$invalidate) {
    	let { close } = $$props;
    	let { title = "Alert" } = $$props;
    	let { message } = $$props;
    	let { okText = "OK" } = $$props;
    	let { icon } = $$props;
    	const ok = () => close(true);

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(5, close = $$props.close);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('message' in $$props) $$invalidate(1, message = $$props.message);
    		if ('okText' in $$props) $$invalidate(2, okText = $$props.okText);
    		if ('icon' in $$props) $$invalidate(3, icon = $$props.icon);
    	};

    	return [title, message, okText, icon, ok, close];
    }

    class Alert extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$J, create_fragment$15, safe_not_equal, {
    			close: 5,
    			title: 0,
    			message: 1,
    			okText: 2,
    			icon: 3
    		});
    	}
    }

    /* core\dialog\confirm.svelte generated by Svelte v3.55.0 */

    function create_default_slot_6$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*message*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*message*/ 2) set_data(t, /*message*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (25:4) <Paper card>
    function create_default_slot_5$c(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_6$a] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope, message*/ 258) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (27:12) {#if title}
    function create_if_block$6(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Titlebar({
    			props: {
    				compact: true,
    				$$slots: { default: [create_default_slot_4$d] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope, title, icon*/ 273) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    		}
    	};
    }

    // (29:20) {#if icon}
    function create_if_block_1$3(ctx) {
    	let icon_1;
    	let current;
    	icon_1 = new Icon({ props: { name: /*icon*/ ctx[4] } });

    	return {
    		c() {
    			create_component(icon_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 16) icon_1_changes.name = /*icon*/ ctx[4];
    			icon_1.$set(icon_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};
    }

    // (28:16) <Titlebar compact>
    function create_default_slot_4$d(ctx) {
    	let t0;
    	let t1;
    	let current;
    	let if_block = /*icon*/ ctx[4] && create_if_block_1$3(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(/*title*/ ctx[0]);
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*icon*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*icon*/ 16) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*title*/ 1) set_data(t1, /*title*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (26:8) <svelte:fragment slot="title">
    function create_title_slot$5(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*title*/ ctx[0] && create_if_block$6(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*title*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (40:12) <Button color="danger" on:click={cancel}>
    function create_default_slot_3$d(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*cancelText*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*cancelText*/ 8) set_data(t, /*cancelText*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (43:12) <Button color="secondary" on:click={ok}>
    function create_default_slot_2$h(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*okText*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*okText*/ 4) set_data(t, /*okText*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (39:8) <Grid cols="1fr 1fr" slot="action">
    function create_default_slot_1$j(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				color: "danger",
    				$$slots: { default: [create_default_slot_3$d] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*cancel*/ ctx[6]);

    	button1 = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_2$h] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("click", /*ok*/ ctx[5]);

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope, cancelText*/ 264) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope, okText*/ 260) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t);
    			destroy_component(button1, detaching);
    		}
    	};
    }

    // (39:8) 
    function create_action_slot$7(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr",
    				slot: "action",
    				$$slots: { default: [create_default_slot_1$j] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(grid.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, okText, cancelText*/ 268) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};
    }

    // (24:0) <DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    function create_default_slot$s(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					action: [create_action_slot$7],
    					title: [create_title_slot$5],
    					default: [create_default_slot_5$c]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, okText, cancelText, title, icon, message*/ 287) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    function create_fragment$14(ctx) {
    	let dialogcontent;
    	let current;

    	dialogcontent = new Content({
    			props: {
    				top: "25%",
    				left: "50%",
    				originX: "50%",
    				width: "min(70vw, 320px)",
    				$$slots: { default: [create_default_slot$s] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(dialogcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(dialogcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const dialogcontent_changes = {};

    			if (dirty & /*$$scope, okText, cancelText, title, icon, message*/ 287) {
    				dialogcontent_changes.$$scope = { dirty, ctx };
    			}

    			dialogcontent.$set(dialogcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dialogcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dialogcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(dialogcontent, detaching);
    		}
    	};
    }

    function instance$I($$self, $$props, $$invalidate) {
    	let { close } = $$props;
    	let { title = "Confirm" } = $$props;
    	let { message } = $$props;
    	let { okText = "OK" } = $$props;
    	let { cancelText = "Cancel" } = $$props;
    	let { icon } = $$props;
    	const ok = () => close(true);
    	const cancel = () => close(false);

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(7, close = $$props.close);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('message' in $$props) $$invalidate(1, message = $$props.message);
    		if ('okText' in $$props) $$invalidate(2, okText = $$props.okText);
    		if ('cancelText' in $$props) $$invalidate(3, cancelText = $$props.cancelText);
    		if ('icon' in $$props) $$invalidate(4, icon = $$props.icon);
    	};

    	return [title, message, okText, cancelText, icon, ok, cancel, close];
    }

    class Confirm extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$I, create_fragment$14, safe_not_equal, {
    			close: 7,
    			title: 0,
    			message: 1,
    			okText: 2,
    			cancelText: 3,
    			icon: 4
    		});
    	}
    }

    /* core\dialog\prompt.svelte generated by Svelte v3.55.0 */

    function add_css$3(target) {
    	append_styles(target, "svelte-1h7ubho", "form.svelte-1h7ubho{display:grid}");
    }

    // (56:8) <Text>
    function create_default_slot_6$9(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*message*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*message*/ 2) set_data(t, /*message*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (45:4) <Paper card>
    function create_default_slot_5$b(ctx) {
    	let text_1;
    	let t;
    	let form;
    	let textinput;
    	let updating_value;
    	let current;
    	let mounted;
    	let dispose;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_6$9] },
    				$$scope: { ctx }
    			}
    		});

    	function textinput_value_binding(value) {
    		/*textinput_value_binding*/ ctx[12](value);
    	}

    	let textinput_props = {
    		placeholder: /*placeholder*/ ctx[2],
    		type: "text",
    		variant: "outline"
    	};

    	if (/*value*/ ctx[7] !== void 0) {
    		textinput_props.value = /*value*/ ctx[7];
    	}

    	textinput = new Text_input$1({ props: textinput_props });
    	binding_callbacks.push(() => bind(textinput, 'value', textinput_value_binding, /*value*/ ctx[7]));
    	/*textinput_binding*/ ctx[13](textinput);

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t = space();
    			form = element("form");
    			create_component(textinput.$$.fragment);
    			attr(form, "class", "svelte-1h7ubho");
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t, anchor);
    			insert(target, form, anchor);
    			mount_component(textinput, form, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(form, "submit", /*submitOK*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope, message*/ 16386) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const textinput_changes = {};
    			if (dirty & /*placeholder*/ 4) textinput_changes.placeholder = /*placeholder*/ ctx[2];

    			if (!updating_value && dirty & /*value*/ 128) {
    				updating_value = true;
    				textinput_changes.value = /*value*/ ctx[7];
    				add_flush_callback(() => updating_value = false);
    			}

    			textinput.$set(textinput_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(textinput.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(textinput.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(form);
    			/*textinput_binding*/ ctx[13](null);
    			destroy_component(textinput);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (47:12) {#if title}
    function create_if_block$5(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Titlebar({
    			props: {
    				compact: true,
    				$$slots: { default: [create_default_slot_4$c] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope, title, icon*/ 16417) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    		}
    	};
    }

    // (49:20) {#if icon}
    function create_if_block_1$2(ctx) {
    	let icon_1;
    	let current;
    	icon_1 = new Icon({ props: { name: /*icon*/ ctx[5] } });

    	return {
    		c() {
    			create_component(icon_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 32) icon_1_changes.name = /*icon*/ ctx[5];
    			icon_1.$set(icon_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};
    }

    // (48:16) <Titlebar compact>
    function create_default_slot_4$c(ctx) {
    	let t0;
    	let t1;
    	let current;
    	let if_block = /*icon*/ ctx[5] && create_if_block_1$2(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(/*title*/ ctx[0]);
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*icon*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*icon*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*title*/ 1) set_data(t1, /*title*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (46:8) <svelte:fragment slot="title">
    function create_title_slot$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*title*/ ctx[0] && create_if_block$5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*title*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (69:12) <Button color="danger" on:click={cancel}>
    function create_default_slot_3$c(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*cancelText*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*cancelText*/ 16) set_data(t, /*cancelText*/ ctx[4]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (72:12) <Button color="secondary" on:click={ok}>
    function create_default_slot_2$g(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*okText*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*okText*/ 8) set_data(t, /*okText*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (68:8) <Grid cols="1fr 1fr" slot="action">
    function create_default_slot_1$i(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				color: "danger",
    				$$slots: { default: [create_default_slot_3$c] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*cancel*/ ctx[10]);

    	button1 = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_2$g] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("click", /*ok*/ ctx[8]);

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope, cancelText*/ 16400) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope, okText*/ 16392) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t);
    			destroy_component(button1, detaching);
    		}
    	};
    }

    // (68:8) 
    function create_action_slot$6(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr",
    				slot: "action",
    				$$slots: { default: [create_default_slot_1$i] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(grid.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, okText, cancelText*/ 16408) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};
    }

    // (44:0) <DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    function create_default_slot$r(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					action: [create_action_slot$6],
    					title: [create_title_slot$4],
    					default: [create_default_slot_5$b]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, okText, cancelText, title, icon, placeholder, value, textInput, message*/ 16639) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    function create_fragment$13(ctx) {
    	let dialogcontent;
    	let current;

    	dialogcontent = new Content({
    			props: {
    				top: "25%",
    				left: "50%",
    				originX: "50%",
    				width: "min(70vw, 320px)",
    				$$slots: { default: [create_default_slot$r] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(dialogcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(dialogcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const dialogcontent_changes = {};

    			if (dirty & /*$$scope, okText, cancelText, title, icon, placeholder, value, textInput, message*/ 16639) {
    				dialogcontent_changes.$$scope = { dirty, ctx };
    			}

    			dialogcontent.$set(dialogcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dialogcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dialogcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(dialogcontent, detaching);
    		}
    	};
    }

    function instance$H($$self, $$props, $$invalidate) {
    	let { close } = $$props;
    	let { title = "Prompt" } = $$props;
    	let { message } = $$props;
    	let { placeholder = "" } = $$props;
    	let { okText = "OK" } = $$props;
    	let { cancelText = "Cancel" } = $$props;
    	let { icon } = $$props;
    	const ok = () => close(value);

    	const submitOK = evt => {
    		evt.preventDefault();
    		evt.stopPropagation();
    		ok();
    	};

    	const cancel = () => close(false);
    	let value = "";
    	let textInput = null;

    	function textinput_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(7, value);
    	}

    	function textinput_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			textInput = $$value;
    			$$invalidate(6, textInput);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(11, close = $$props.close);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('message' in $$props) $$invalidate(1, message = $$props.message);
    		if ('placeholder' in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ('okText' in $$props) $$invalidate(3, okText = $$props.okText);
    		if ('cancelText' in $$props) $$invalidate(4, cancelText = $$props.cancelText);
    		if ('icon' in $$props) $$invalidate(5, icon = $$props.icon);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*textInput*/ 64) {
    			if (textInput !== null) {
    				textInput.focus();
    			}
    		}
    	};

    	return [
    		title,
    		message,
    		placeholder,
    		okText,
    		cancelText,
    		icon,
    		textInput,
    		value,
    		ok,
    		submitOK,
    		cancel,
    		close,
    		textinput_value_binding,
    		textinput_binding
    	];
    }

    class Prompt extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$H,
    			create_fragment$13,
    			safe_not_equal,
    			{
    				close: 11,
    				title: 0,
    				message: 1,
    				placeholder: 2,
    				okText: 3,
    				cancelText: 4,
    				icon: 5
    			},
    			add_css$3
    		);
    	}
    }

    /* core\theme\light.svelte generated by Svelte v3.55.0 */

    function create_fragment$12(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(/*theme*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$G($$self) {
    	const theme = css`
        body {
            --font: Roboto;
            --background: #e9e9e9;
            --background-layer: #ffffff;
            --layer-border-width: 1px;
            --layer-border-color: #aaaaaa;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #1d62d5;
            --primary-light: #79c0f7;
            --primary-ripple: #1d62d560;
            --secondary: #128f12;
            --secondary-ripple: #128f1260;
            --danger: #F44336;
            --danger-ripple: #F4433660;
            --button-filled-text-color: var(--text-invert);

            --text-normal: var(--text-dark);
            --text-secondary: #505050;
            --text-invert: var(--text-light);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-subtitle: 12px;

            --ripple-normal: var(--ripple-dark);
            --ripple-invert: var(--ripple-light);
        }
    `;

    	return [theme];
    }

    class Light extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$G, create_fragment$12, safe_not_equal, {});
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.55.0 */

    function create_fragment$11(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(/*theme*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$F($$self) {
    	const theme = css`
        body {
            --font: Roboto;
            --background: #161616;
            --background-layer: #333333;
            --layer-border-width: 1px;
            --layer-border-color: var(--text-normal);

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #00aaff;
            --primary-light: #79c0f7;
            --primary-ripple: #00aaff60;
            --secondary: #2fbc2f;
            --secondary-ripple: #2fbc2f60;
            --danger: #df5348;
            --danger-ripple: #df534860;
            --button-filled-text-color: var(--text-normal);

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-subtitle: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
        }
    `;

    	return [theme];
    }

    class Dark extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$F, create_fragment$11, safe_not_equal, {});
    	}
    }

    /* core\theme\tron.svelte generated by Svelte v3.55.0 */

    function create_fragment$10(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(/*theme*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$E($$self) {
    	const theme = css`
        body {
            --font: Orbitron;
            --background: #030303;
            --background-layer: #04080C;
            --layer-border-width: 1px;
            --layer-border-color: #00EEEE;
            --title-bar-background: #00EEEE;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #00aaff;
            --primary-light: #79c0f7;
            --primary-ripple: #00aaff60;
            --secondary: #2fbc2f;
            --secondary-ripple: #2fbc2f60;
            --danger: #df5348;
            --danger-ripple: #df534860;
            --button-filled-text-color: var(--text-normal);

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-subtitle: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
            --shadow-color: rgb(255, 255, 255, 0.25);
        }
    `;

    	return [theme];
    }

    class Tron extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$E, create_fragment$10, safe_not_equal, {});
    	}
    }

    const readHash = () => {
        if (typeof document !== "undefined") {
            return document.location.hash.toString().slice(1)
        }
        return ""
    };
    const hashStore = readable(
        readHash(),
        set => {
            const scanner = setInterval(
                () => set(readHash()),
                20
            );
            return () => clearInterval(scanner)
        }
    );

    var hash = {
        subscribe: hashStore.subscribe,
        set: (value) => {
            if (value === null) {
                history.pushState(
                    null,
                    null,
                    `${location.origin}${location.pathname}`
                );
                return
            }
            history.pushState(null, null, `#${value}`);
        },
        clear: () => history.pushState(null, null, "")
    };

    const onChange = (value) => {
        const initial = value;
        return (next) => next !== initial
    };

    const drawer = {
        open: openDrawer,
    };
    const dialog = {
        show: showDialog,
    };

    const themeMap = {
        light: Light,
        dark: Dark,
        tron: Tron,
    };
    const themeValue = writable(
        localStorage.theme ?? "dark"
    );
    const theme = derived(
        [themeValue],
        ([value]) => themeMap[value]
    );

    themeValue.subscribe(
        (value) => localStorage.theme = value
    );

    function supressWarnings() {
      const origWarn = console.warn;

      console.warn = (message) => {
        if (message.includes('unknown prop')) return
        if (message.includes('unexpected slot')) return
        origWarn(message);
      };

      onMount(() => {
        console.warn = origWarn;
      });
    }

    /* node_modules\svelte-markdown\src\Parser.svelte generated by Svelte v3.55.0 */

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (19:2) {#if renderers[type]}
    function create_if_block_1$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_2$1, create_if_block_3$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*type*/ ctx[0] === 'table') return 0;
    		if (/*type*/ ctx[0] === 'list') return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (14:0) {#if !type}
    function create_if_block$4(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*tokens*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*tokens, renderers*/ 34) {
    				each_value = /*tokens*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (69:4) {:else}
    function create_else_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*$$restProps*/ ctx[6]];
    	var switch_value = /*renderers*/ ctx[5][/*type*/ ctx[0]];

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot_11] },
    			$$scope: { ctx }
    		};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$$restProps*/ 64)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*$$restProps*/ ctx[6])])
    			: {};

    			if (dirty & /*$$scope, tokens, renderers, $$restProps*/ 8388706) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5][/*type*/ ctx[0]])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (51:30) 
    function create_if_block_3$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_4$1, create_else_block$4];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*ordered*/ ctx[4]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (20:4) {#if type === 'table'}
    function create_if_block_2$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].table;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot$q] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*$$scope, renderers, rows, $$restProps, header*/ 8388716) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].table)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (73:8) {:else}
    function create_else_block_2(ctx) {
    	let t_value = /*$$restProps*/ ctx[6].raw + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$$restProps*/ 64 && t_value !== (t_value = /*$$restProps*/ ctx[6].raw + "")) set_data(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (71:8) {#if tokens}
    function create_if_block_5$1(ctx) {
    	let parser;
    	let current;

    	parser = new Parser$1({
    			props: {
    				tokens: /*tokens*/ ctx[1],
    				renderers: /*renderers*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const parser_changes = {};
    			if (dirty & /*tokens*/ 2) parser_changes.tokens = /*tokens*/ ctx[1];
    			if (dirty & /*renderers*/ 32) parser_changes.renderers = /*renderers*/ ctx[5];
    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    		}
    	};
    }

    // (70:6) <svelte:component this={renderers[type]} {...$$restProps}>
    function create_default_slot_11(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_5$1, create_else_block_2];
    	const if_blocks = [];

    	function select_block_type_3(ctx, dirty) {
    		if (/*tokens*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_3(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_3(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (60:6) {:else}
    function create_else_block$4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ ordered: /*ordered*/ ctx[4] }, /*$$restProps*/ ctx[6]];
    	var switch_value = /*renderers*/ ctx[5].list;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot_9$2] },
    			$$scope: { ctx }
    		};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*ordered, $$restProps*/ 80)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*ordered*/ 16 && { ordered: /*ordered*/ ctx[4] },
    					dirty & /*$$restProps*/ 64 && get_spread_object(/*$$restProps*/ ctx[6])
    				])
    			: {};

    			if (dirty & /*$$scope, $$restProps, renderers*/ 8388704) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].list)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (52:6) {#if ordered}
    function create_if_block_4$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ ordered: /*ordered*/ ctx[4] }, /*$$restProps*/ ctx[6]];
    	var switch_value = /*renderers*/ ctx[5].list;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot_7$6] },
    			$$scope: { ctx }
    		};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*ordered, $$restProps*/ 80)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*ordered*/ 16 && { ordered: /*ordered*/ ctx[4] },
    					dirty & /*$$restProps*/ 64 && get_spread_object(/*$$restProps*/ ctx[6])
    				])
    			: {};

    			if (dirty & /*$$scope, $$restProps, renderers*/ 8388704) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].list)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (63:12) <svelte:component this={renderers.unorderedlistitem || renderers.listitem} {...item}>
    function create_default_slot_10$1(ctx) {
    	let parser;
    	let t;
    	let current;

    	parser = new Parser$1({
    			props: {
    				tokens: /*item*/ ctx[18].tokens,
    				renderers: /*renderers*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const parser_changes = {};
    			if (dirty & /*$$restProps*/ 64) parser_changes.tokens = /*item*/ ctx[18].tokens;
    			if (dirty & /*renderers*/ 32) parser_changes.renderers = /*renderers*/ ctx[5];
    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (62:10) {#each $$restProps.items as item}
    function create_each_block_5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*item*/ ctx[18]];
    	var switch_value = /*renderers*/ ctx[5].unorderedlistitem || /*renderers*/ ctx[5].listitem;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot_10$1] },
    			$$scope: { ctx }
    		};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$$restProps*/ 64)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*item*/ ctx[18])])
    			: {};

    			if (dirty & /*$$scope, $$restProps, renderers*/ 8388704) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].unorderedlistitem || /*renderers*/ ctx[5].listitem)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (61:8) <svelte:component this={renderers.list} {ordered} {...$$restProps}>
    function create_default_slot_9$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_5 = /*$$restProps*/ ctx[6].items;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*renderers, $$restProps*/ 96) {
    				each_value_5 = /*$$restProps*/ ctx[6].items;
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_5.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_5.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (55:12) <svelte:component this={renderers.orderedlistitem || renderers.listitem} {...item}>
    function create_default_slot_8$4(ctx) {
    	let parser;
    	let t;
    	let current;

    	parser = new Parser$1({
    			props: {
    				tokens: /*item*/ ctx[18].tokens,
    				renderers: /*renderers*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const parser_changes = {};
    			if (dirty & /*$$restProps*/ 64) parser_changes.tokens = /*item*/ ctx[18].tokens;
    			if (dirty & /*renderers*/ 32) parser_changes.renderers = /*renderers*/ ctx[5];
    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (54:10) {#each $$restProps.items as item}
    function create_each_block_4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*item*/ ctx[18]];
    	var switch_value = /*renderers*/ ctx[5].orderedlistitem || /*renderers*/ ctx[5].listitem;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot_8$4] },
    			$$scope: { ctx }
    		};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$$restProps*/ 64)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*item*/ ctx[18])])
    			: {};

    			if (dirty & /*$$scope, $$restProps, renderers*/ 8388704) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].orderedlistitem || /*renderers*/ ctx[5].listitem)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (53:8) <svelte:component this={renderers.list} {ordered} {...$$restProps}>
    function create_default_slot_7$6(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_4 = /*$$restProps*/ ctx[6].items;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*renderers, $$restProps*/ 96) {
    				each_value_4 = /*$$restProps*/ ctx[6].items;
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_4.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_4.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (25:14) <svelte:component                 this={renderers.tablecell}                 header={true}                 align={$$restProps.align[i] || 'center'}                 >
    function create_default_slot_6$8(ctx) {
    	let parser;
    	let t;
    	let current;

    	parser = new Parser$1({
    			props: {
    				tokens: /*headerItem*/ ctx[16].tokens,
    				renderers: /*renderers*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const parser_changes = {};
    			if (dirty & /*header*/ 4) parser_changes.tokens = /*headerItem*/ ctx[16].tokens;
    			if (dirty & /*renderers*/ 32) parser_changes.renderers = /*renderers*/ ctx[5];
    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (24:12) {#each header as headerItem, i}
    function create_each_block_3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablecell;

    	function switch_props(ctx) {
    		return {
    			props: {
    				header: true,
    				align: /*$$restProps*/ ctx[6].align[/*i*/ ctx[15]] || 'center',
    				$$slots: { default: [create_default_slot_6$8] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*$$restProps*/ 64) switch_instance_changes.align = /*$$restProps*/ ctx[6].align[/*i*/ ctx[15]] || 'center';

    			if (dirty & /*$$scope, header, renderers*/ 8388644) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].tablecell)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (23:10) <svelte:component this={renderers.tablerow}>
    function create_default_slot_5$a(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_3 = /*header*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*renderers, $$restProps, header*/ 100) {
    				each_value_3 = /*header*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (22:8) <svelte:component this={renderers.tablehead}>
    function create_default_slot_4$b(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablerow;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_5$a] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*$$scope, header, renderers, $$restProps*/ 8388708) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].tablerow)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (39:16) <svelte:component                   this={renderers.tablecell}                   header={false}                   align={$$restProps.align[i] || 'center'}                   >
    function create_default_slot_3$b(ctx) {
    	let parser;
    	let current;

    	parser = new Parser$1({
    			props: {
    				tokens: /*cells*/ ctx[13].tokens,
    				renderers: /*renderers*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const parser_changes = {};
    			if (dirty & /*rows*/ 8) parser_changes.tokens = /*cells*/ ctx[13].tokens;
    			if (dirty & /*renderers*/ 32) parser_changes.renderers = /*renderers*/ ctx[5];
    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    		}
    	};
    }

    // (38:14) {#each row as cells, i}
    function create_each_block_2$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablecell;

    	function switch_props(ctx) {
    		return {
    			props: {
    				header: false,
    				align: /*$$restProps*/ ctx[6].align[/*i*/ ctx[15]] || 'center',
    				$$slots: { default: [create_default_slot_3$b] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*$$restProps*/ 64) switch_instance_changes.align = /*$$restProps*/ ctx[6].align[/*i*/ ctx[15]] || 'center';

    			if (dirty & /*$$scope, rows, renderers*/ 8388648) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].tablecell)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (37:12) <svelte:component this={renderers.tablerow}>
    function create_default_slot_2$f(ctx) {
    	let t;
    	let current;
    	let each_value_2 = /*row*/ ctx[10];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*renderers, $$restProps, rows*/ 104) {
    				each_value_2 = /*row*/ ctx[10];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (36:10) {#each rows as row}
    function create_each_block_1$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablerow;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_2$f] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*$$scope, rows, renderers, $$restProps*/ 8388712) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].tablerow)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (35:8) <svelte:component this={renderers.tablebody}>
    function create_default_slot_1$h(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*rows*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*renderers, rows, $$restProps*/ 104) {
    				each_value_1 = /*rows*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (21:6) <svelte:component this={renderers.table}>
    function create_default_slot$q(ctx) {
    	let switch_instance0;
    	let t;
    	let switch_instance1;
    	let switch_instance1_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablehead;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_4$b] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance0 = construct_svelte_component(switch_value, switch_props(ctx));
    	}

    	var switch_value_1 = /*renderers*/ ctx[5].tablebody;

    	function switch_props_1(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_1$h] },
    				$$scope: { ctx }
    			}
    		};
    	}

    	if (switch_value_1) {
    		switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t = space();
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			switch_instance1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance0) mount_component(switch_instance0, target, anchor);
    			insert(target, t, anchor);
    			if (switch_instance1) mount_component(switch_instance1, target, anchor);
    			insert(target, switch_instance1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance0_changes = {};

    			if (dirty & /*$$scope, renderers, header, $$restProps*/ 8388708) {
    				switch_instance0_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*renderers*/ ctx[5].tablehead)) {
    				if (switch_instance0) {
    					group_outros();
    					const old_component = switch_instance0;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance0 = construct_svelte_component(switch_value, switch_props(ctx));
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, t.parentNode, t);
    				} else {
    					switch_instance0 = null;
    				}
    			} else if (switch_value) {
    				switch_instance0.$set(switch_instance0_changes);
    			}

    			const switch_instance1_changes = {};

    			if (dirty & /*$$scope, rows, renderers, $$restProps*/ 8388712) {
    				switch_instance1_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value_1 !== (switch_value_1 = /*renderers*/ ctx[5].tablebody)) {
    				if (switch_instance1) {
    					group_outros();
    					const old_component = switch_instance1;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_1) {
    					switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1(ctx));
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, switch_instance1_anchor.parentNode, switch_instance1_anchor);
    				} else {
    					switch_instance1 = null;
    				}
    			} else if (switch_value_1) {
    				switch_instance1.$set(switch_instance1_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance0) destroy_component(switch_instance0, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(switch_instance1_anchor);
    			if (switch_instance1) destroy_component(switch_instance1, detaching);
    		}
    	};
    }

    // (15:2) {#each tokens as token}
    function create_each_block$3(ctx) {
    	let parser;
    	let current;
    	const parser_spread_levels = [/*token*/ ctx[7], { renderers: /*renderers*/ ctx[5] }];
    	let parser_props = {};

    	for (let i = 0; i < parser_spread_levels.length; i += 1) {
    		parser_props = assign(parser_props, parser_spread_levels[i]);
    	}

    	parser = new Parser$1({ props: parser_props });

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const parser_changes = (dirty & /*tokens, renderers*/ 34)
    			? get_spread_update(parser_spread_levels, [
    					dirty & /*tokens*/ 2 && get_spread_object(/*token*/ ctx[7]),
    					dirty & /*renderers*/ 32 && { renderers: /*renderers*/ ctx[5] }
    				])
    			: {};

    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    		}
    	};
    }

    function create_fragment$$(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_if_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*type*/ ctx[0]) return 0;
    		if (/*renderers*/ ctx[5][/*type*/ ctx[0]]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$D($$self, $$props, $$invalidate) {
    	const omit_props_names = ["type","tokens","header","rows","ordered","renderers"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { type = undefined } = $$props;
    	let { tokens = undefined } = $$props;
    	let { header = undefined } = $$props;
    	let { rows = undefined } = $$props;
    	let { ordered = false } = $$props;
    	let { renderers } = $$props;
    	supressWarnings();

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ('type' in $$new_props) $$invalidate(0, type = $$new_props.type);
    		if ('tokens' in $$new_props) $$invalidate(1, tokens = $$new_props.tokens);
    		if ('header' in $$new_props) $$invalidate(2, header = $$new_props.header);
    		if ('rows' in $$new_props) $$invalidate(3, rows = $$new_props.rows);
    		if ('ordered' in $$new_props) $$invalidate(4, ordered = $$new_props.ordered);
    		if ('renderers' in $$new_props) $$invalidate(5, renderers = $$new_props.renderers);
    	};

    	return [type, tokens, header, rows, ordered, renderers, $$restProps];
    }

    class Parser$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$D, create_fragment$$, safe_not_equal, {
    			type: 0,
    			tokens: 1,
    			header: 2,
    			rows: 3,
    			ordered: 4,
    			renderers: 5
    		});
    	}
    }

    /**
     * marked - a markdown parser
     * Copyright (c) 2011-2022, Christopher Jeffrey. (MIT Licensed)
     * https://github.com/markedjs/marked
     */

    /**
     * DO NOT EDIT THIS FILE
     * The code in this file is generated from files in ./src/
     */

    function getDefaults() {
      return {
        async: false,
        baseUrl: null,
        breaks: false,
        extensions: null,
        gfm: true,
        headerIds: true,
        headerPrefix: '',
        highlight: null,
        langPrefix: 'language-',
        mangle: true,
        pedantic: false,
        renderer: null,
        sanitize: false,
        sanitizer: null,
        silent: false,
        smartypants: false,
        tokenizer: null,
        walkTokens: null,
        xhtml: false
      };
    }

    let defaults = getDefaults();

    function changeDefaults(newDefaults) {
      defaults = newDefaults;
    }

    /**
     * Helpers
     */
    const escapeTest = /[&<>"']/;
    const escapeReplace = new RegExp(escapeTest.source, 'g');
    const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
    const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
    const escapeReplacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    const getEscapeReplacement = (ch) => escapeReplacements[ch];
    function escape(html, encode) {
      if (encode) {
        if (escapeTest.test(html)) {
          return html.replace(escapeReplace, getEscapeReplacement);
        }
      } else {
        if (escapeTestNoEncode.test(html)) {
          return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
      }

      return html;
    }

    const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

    /**
     * @param {string} html
     */
    function unescape(html) {
      // explicitly match decimal, hex, and named HTML entities
      return html.replace(unescapeTest, (_, n) => {
        n = n.toLowerCase();
        if (n === 'colon') return ':';
        if (n.charAt(0) === '#') {
          return n.charAt(1) === 'x'
            ? String.fromCharCode(parseInt(n.substring(2), 16))
            : String.fromCharCode(+n.substring(1));
        }
        return '';
      });
    }

    const caret = /(^|[^\[])\^/g;

    /**
     * @param {string | RegExp} regex
     * @param {string} opt
     */
    function edit(regex, opt) {
      regex = typeof regex === 'string' ? regex : regex.source;
      opt = opt || '';
      const obj = {
        replace: (name, val) => {
          val = val.source || val;
          val = val.replace(caret, '$1');
          regex = regex.replace(name, val);
          return obj;
        },
        getRegex: () => {
          return new RegExp(regex, opt);
        }
      };
      return obj;
    }

    const nonWordAndColonTest = /[^\w:]/g;
    const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;

    /**
     * @param {boolean} sanitize
     * @param {string} base
     * @param {string} href
     */
    function cleanUrl(sanitize, base, href) {
      if (sanitize) {
        let prot;
        try {
          prot = decodeURIComponent(unescape(href))
            .replace(nonWordAndColonTest, '')
            .toLowerCase();
        } catch (e) {
          return null;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
          return null;
        }
      }
      if (base && !originIndependentUrl.test(href)) {
        href = resolveUrl(base, href);
      }
      try {
        href = encodeURI(href).replace(/%25/g, '%');
      } catch (e) {
        return null;
      }
      return href;
    }

    const baseUrls = {};
    const justDomain = /^[^:]+:\/*[^/]*$/;
    const protocol = /^([^:]+:)[\s\S]*$/;
    const domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;

    /**
     * @param {string} base
     * @param {string} href
     */
    function resolveUrl(base, href) {
      if (!baseUrls[' ' + base]) {
        // we can ignore everything in base after the last slash of its path component,
        // but we might need to add _that_
        // https://tools.ietf.org/html/rfc3986#section-3
        if (justDomain.test(base)) {
          baseUrls[' ' + base] = base + '/';
        } else {
          baseUrls[' ' + base] = rtrim(base, '/', true);
        }
      }
      base = baseUrls[' ' + base];
      const relativeBase = base.indexOf(':') === -1;

      if (href.substring(0, 2) === '//') {
        if (relativeBase) {
          return href;
        }
        return base.replace(protocol, '$1') + href;
      } else if (href.charAt(0) === '/') {
        if (relativeBase) {
          return href;
        }
        return base.replace(domain, '$1') + href;
      } else {
        return base + href;
      }
    }

    const noopTest = { exec: function noopTest() {} };

    function merge(obj) {
      let i = 1,
        target,
        key;

      for (; i < arguments.length; i++) {
        target = arguments[i];
        for (key in target) {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            obj[key] = target[key];
          }
        }
      }

      return obj;
    }

    function splitCells(tableRow, count) {
      // ensure that every cell-delimiting pipe has a space
      // before it to distinguish it from an escaped pipe
      const row = tableRow.replace(/\|/g, (match, offset, str) => {
          let escaped = false,
            curr = offset;
          while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
          if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return '|';
          } else {
            // add space before unescaped |
            return ' |';
          }
        }),
        cells = row.split(/ \|/);
      let i = 0;

      // First/last cell in a row cannot be empty if it has no leading/trailing pipe
      if (!cells[0].trim()) { cells.shift(); }
      if (cells.length > 0 && !cells[cells.length - 1].trim()) { cells.pop(); }

      if (cells.length > count) {
        cells.splice(count);
      } else {
        while (cells.length < count) cells.push('');
      }

      for (; i < cells.length; i++) {
        // leading or trailing whitespace is ignored per the gfm spec
        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
      }
      return cells;
    }

    /**
     * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
     * /c*$/ is vulnerable to REDOS.
     *
     * @param {string} str
     * @param {string} c
     * @param {boolean} invert Remove suffix of non-c chars instead. Default falsey.
     */
    function rtrim(str, c, invert) {
      const l = str.length;
      if (l === 0) {
        return '';
      }

      // Length of suffix matching the invert condition.
      let suffLen = 0;

      // Step left until we fail to match the invert condition.
      while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
          suffLen++;
        } else if (currChar !== c && invert) {
          suffLen++;
        } else {
          break;
        }
      }

      return str.slice(0, l - suffLen);
    }

    function findClosingBracket(str, b) {
      if (str.indexOf(b[1]) === -1) {
        return -1;
      }
      const l = str.length;
      let level = 0,
        i = 0;
      for (; i < l; i++) {
        if (str[i] === '\\') {
          i++;
        } else if (str[i] === b[0]) {
          level++;
        } else if (str[i] === b[1]) {
          level--;
          if (level < 0) {
            return i;
          }
        }
      }
      return -1;
    }

    function checkSanitizeDeprecation(opt) {
      if (opt && opt.sanitize && !opt.silent) {
        console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
      }
    }

    // copied from https://stackoverflow.com/a/5450113/806777
    /**
     * @param {string} pattern
     * @param {number} count
     */
    function repeatString(pattern, count) {
      if (count < 1) {
        return '';
      }
      let result = '';
      while (count > 1) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result + pattern;
    }

    function outputLink(cap, link, raw, lexer) {
      const href = link.href;
      const title = link.title ? escape(link.title) : null;
      const text = cap[1].replace(/\\([\[\]])/g, '$1');

      if (cap[0].charAt(0) !== '!') {
        lexer.state.inLink = true;
        const token = {
          type: 'link',
          raw,
          href,
          title,
          text,
          tokens: lexer.inlineTokens(text)
        };
        lexer.state.inLink = false;
        return token;
      }
      return {
        type: 'image',
        raw,
        href,
        title,
        text: escape(text)
      };
    }

    function indentCodeCompensation(raw, text) {
      const matchIndentToCode = raw.match(/^(\s+)(?:```)/);

      if (matchIndentToCode === null) {
        return text;
      }

      const indentToCode = matchIndentToCode[1];

      return text
        .split('\n')
        .map(node => {
          const matchIndentInNode = node.match(/^\s+/);
          if (matchIndentInNode === null) {
            return node;
          }

          const [indentInNode] = matchIndentInNode;

          if (indentInNode.length >= indentToCode.length) {
            return node.slice(indentToCode.length);
          }

          return node;
        })
        .join('\n');
    }

    /**
     * Tokenizer
     */
    class Tokenizer {
      constructor(options) {
        this.options = options || defaults;
      }

      space(src) {
        const cap = this.rules.block.newline.exec(src);
        if (cap && cap[0].length > 0) {
          return {
            type: 'space',
            raw: cap[0]
          };
        }
      }

      code(src) {
        const cap = this.rules.block.code.exec(src);
        if (cap) {
          const text = cap[0].replace(/^ {1,4}/gm, '');
          return {
            type: 'code',
            raw: cap[0],
            codeBlockStyle: 'indented',
            text: !this.options.pedantic
              ? rtrim(text, '\n')
              : text
          };
        }
      }

      fences(src) {
        const cap = this.rules.block.fences.exec(src);
        if (cap) {
          const raw = cap[0];
          const text = indentCodeCompensation(raw, cap[3] || '');

          return {
            type: 'code',
            raw,
            lang: cap[2] ? cap[2].trim().replace(this.rules.inline._escapes, '$1') : cap[2],
            text
          };
        }
      }

      heading(src) {
        const cap = this.rules.block.heading.exec(src);
        if (cap) {
          let text = cap[2].trim();

          // remove trailing #s
          if (/#$/.test(text)) {
            const trimmed = rtrim(text, '#');
            if (this.options.pedantic) {
              text = trimmed.trim();
            } else if (!trimmed || / $/.test(trimmed)) {
              // CommonMark requires space before trailing #s
              text = trimmed.trim();
            }
          }

          return {
            type: 'heading',
            raw: cap[0],
            depth: cap[1].length,
            text,
            tokens: this.lexer.inline(text)
          };
        }
      }

      hr(src) {
        const cap = this.rules.block.hr.exec(src);
        if (cap) {
          return {
            type: 'hr',
            raw: cap[0]
          };
        }
      }

      blockquote(src) {
        const cap = this.rules.block.blockquote.exec(src);
        if (cap) {
          const text = cap[0].replace(/^ *>[ \t]?/gm, '');
          const top = this.lexer.state.top;
          this.lexer.state.top = true;
          const tokens = this.lexer.blockTokens(text);
          this.lexer.state.top = top;
          return {
            type: 'blockquote',
            raw: cap[0],
            tokens,
            text
          };
        }
      }

      list(src) {
        let cap = this.rules.block.list.exec(src);
        if (cap) {
          let raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine,
            line, nextLine, rawLine, itemContents, endEarly;

          let bull = cap[1].trim();
          const isordered = bull.length > 1;

          const list = {
            type: 'list',
            raw: '',
            ordered: isordered,
            start: isordered ? +bull.slice(0, -1) : '',
            loose: false,
            items: []
          };

          bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;

          if (this.options.pedantic) {
            bull = isordered ? bull : '[*+-]';
          }

          // Get next list item
          const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);

          // Check if current bullet point can start a new List Item
          while (src) {
            endEarly = false;
            if (!(cap = itemRegex.exec(src))) {
              break;
            }

            if (this.rules.block.hr.test(src)) { // End list if bullet was actually HR (possibly move into itemRegex?)
              break;
            }

            raw = cap[0];
            src = src.substring(raw.length);

            line = cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(3 * t.length));
            nextLine = src.split('\n', 1)[0];

            if (this.options.pedantic) {
              indent = 2;
              itemContents = line.trimLeft();
            } else {
              indent = cap[2].search(/[^ ]/); // Find first non-space char
              indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
              itemContents = line.slice(indent);
              indent += cap[1].length;
            }

            blankLine = false;

            if (!line && /^ *$/.test(nextLine)) { // Items begin with at most one blank line
              raw += nextLine + '\n';
              src = src.substring(nextLine.length + 1);
              endEarly = true;
            }

            if (!endEarly) {
              const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`);
              const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
              const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
              const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);

              // Check if following lines should be included in List Item
              while (src) {
                rawLine = src.split('\n', 1)[0];
                nextLine = rawLine;

                // Re-align to follow commonmark nesting rules
                if (this.options.pedantic) {
                  nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
                }

                // End list item if found code fences
                if (fencesBeginRegex.test(nextLine)) {
                  break;
                }

                // End list item if found start of new heading
                if (headingBeginRegex.test(nextLine)) {
                  break;
                }

                // End list item if found start of new bullet
                if (nextBulletRegex.test(nextLine)) {
                  break;
                }

                // Horizontal rule found
                if (hrRegex.test(src)) {
                  break;
                }

                if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) { // Dedent if possible
                  itemContents += '\n' + nextLine.slice(indent);
                } else {
                  // not enough indentation
                  if (blankLine) {
                    break;
                  }

                  // paragraph continuation unless last line was a different block level element
                  if (line.search(/[^ ]/) >= 4) { // indented code block
                    break;
                  }
                  if (fencesBeginRegex.test(line)) {
                    break;
                  }
                  if (headingBeginRegex.test(line)) {
                    break;
                  }
                  if (hrRegex.test(line)) {
                    break;
                  }

                  itemContents += '\n' + nextLine;
                }

                if (!blankLine && !nextLine.trim()) { // Check if current line is blank
                  blankLine = true;
                }

                raw += rawLine + '\n';
                src = src.substring(rawLine.length + 1);
                line = nextLine.slice(indent);
              }
            }

            if (!list.loose) {
              // If the previous item ended with a blank line, the list is loose
              if (endsWithBlankLine) {
                list.loose = true;
              } else if (/\n *\n *$/.test(raw)) {
                endsWithBlankLine = true;
              }
            }

            // Check for task list items
            if (this.options.gfm) {
              istask = /^\[[ xX]\] /.exec(itemContents);
              if (istask) {
                ischecked = istask[0] !== '[ ] ';
                itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
              }
            }

            list.items.push({
              type: 'list_item',
              raw,
              task: !!istask,
              checked: ischecked,
              loose: false,
              text: itemContents
            });

            list.raw += raw;
          }

          // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
          list.items[list.items.length - 1].raw = raw.trimRight();
          list.items[list.items.length - 1].text = itemContents.trimRight();
          list.raw = list.raw.trimRight();

          const l = list.items.length;

          // Item child tokens handled here at end because we needed to have the final item to trim it first
          for (i = 0; i < l; i++) {
            this.lexer.state.top = false;
            list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);

            if (!list.loose) {
              // Check if list should be loose
              const spacers = list.items[i].tokens.filter(t => t.type === 'space');
              const hasMultipleLineBreaks = spacers.length > 0 && spacers.some(t => /\n.*\n/.test(t.raw));

              list.loose = hasMultipleLineBreaks;
            }
          }

          // Set all items to loose if list is loose
          if (list.loose) {
            for (i = 0; i < l; i++) {
              list.items[i].loose = true;
            }
          }

          return list;
        }
      }

      html(src) {
        const cap = this.rules.block.html.exec(src);
        if (cap) {
          const token = {
            type: 'html',
            raw: cap[0],
            pre: !this.options.sanitizer
              && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
            text: cap[0]
          };
          if (this.options.sanitize) {
            const text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]);
            token.type = 'paragraph';
            token.text = text;
            token.tokens = this.lexer.inline(text);
          }
          return token;
        }
      }

      def(src) {
        const cap = this.rules.block.def.exec(src);
        if (cap) {
          const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
          const href = cap[2] ? cap[2].replace(/^<(.*)>$/, '$1').replace(this.rules.inline._escapes, '$1') : '';
          const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline._escapes, '$1') : cap[3];
          return {
            type: 'def',
            tag,
            raw: cap[0],
            href,
            title
          };
        }
      }

      table(src) {
        const cap = this.rules.block.table.exec(src);
        if (cap) {
          const item = {
            type: 'table',
            header: splitCells(cap[1]).map(c => { return { text: c }; }),
            align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
            rows: cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, '').split('\n') : []
          };

          if (item.header.length === item.align.length) {
            item.raw = cap[0];

            let l = item.align.length;
            let i, j, k, row;
            for (i = 0; i < l; i++) {
              if (/^ *-+: *$/.test(item.align[i])) {
                item.align[i] = 'right';
              } else if (/^ *:-+: *$/.test(item.align[i])) {
                item.align[i] = 'center';
              } else if (/^ *:-+ *$/.test(item.align[i])) {
                item.align[i] = 'left';
              } else {
                item.align[i] = null;
              }
            }

            l = item.rows.length;
            for (i = 0; i < l; i++) {
              item.rows[i] = splitCells(item.rows[i], item.header.length).map(c => { return { text: c }; });
            }

            // parse child tokens inside headers and cells

            // header child tokens
            l = item.header.length;
            for (j = 0; j < l; j++) {
              item.header[j].tokens = this.lexer.inline(item.header[j].text);
            }

            // cell child tokens
            l = item.rows.length;
            for (j = 0; j < l; j++) {
              row = item.rows[j];
              for (k = 0; k < row.length; k++) {
                row[k].tokens = this.lexer.inline(row[k].text);
              }
            }

            return item;
          }
        }
      }

      lheading(src) {
        const cap = this.rules.block.lheading.exec(src);
        if (cap) {
          return {
            type: 'heading',
            raw: cap[0],
            depth: cap[2].charAt(0) === '=' ? 1 : 2,
            text: cap[1],
            tokens: this.lexer.inline(cap[1])
          };
        }
      }

      paragraph(src) {
        const cap = this.rules.block.paragraph.exec(src);
        if (cap) {
          const text = cap[1].charAt(cap[1].length - 1) === '\n'
            ? cap[1].slice(0, -1)
            : cap[1];
          return {
            type: 'paragraph',
            raw: cap[0],
            text,
            tokens: this.lexer.inline(text)
          };
        }
      }

      text(src) {
        const cap = this.rules.block.text.exec(src);
        if (cap) {
          return {
            type: 'text',
            raw: cap[0],
            text: cap[0],
            tokens: this.lexer.inline(cap[0])
          };
        }
      }

      escape(src) {
        const cap = this.rules.inline.escape.exec(src);
        if (cap) {
          return {
            type: 'escape',
            raw: cap[0],
            text: escape(cap[1])
          };
        }
      }

      tag(src) {
        const cap = this.rules.inline.tag.exec(src);
        if (cap) {
          if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
            this.lexer.state.inLink = true;
          } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
            this.lexer.state.inLink = false;
          }
          if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            this.lexer.state.inRawBlock = true;
          } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            this.lexer.state.inRawBlock = false;
          }

          return {
            type: this.options.sanitize
              ? 'text'
              : 'html',
            raw: cap[0],
            inLink: this.lexer.state.inLink,
            inRawBlock: this.lexer.state.inRawBlock,
            text: this.options.sanitize
              ? (this.options.sanitizer
                ? this.options.sanitizer(cap[0])
                : escape(cap[0]))
              : cap[0]
          };
        }
      }

      link(src) {
        const cap = this.rules.inline.link.exec(src);
        if (cap) {
          const trimmedUrl = cap[2].trim();
          if (!this.options.pedantic && /^</.test(trimmedUrl)) {
            // commonmark requires matching angle brackets
            if (!(/>$/.test(trimmedUrl))) {
              return;
            }

            // ending angle bracket cannot be escaped
            const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
            if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
              return;
            }
          } else {
            // find closing parenthesis
            const lastParenIndex = findClosingBracket(cap[2], '()');
            if (lastParenIndex > -1) {
              const start = cap[0].indexOf('!') === 0 ? 5 : 4;
              const linkLen = start + cap[1].length + lastParenIndex;
              cap[2] = cap[2].substring(0, lastParenIndex);
              cap[0] = cap[0].substring(0, linkLen).trim();
              cap[3] = '';
            }
          }
          let href = cap[2];
          let title = '';
          if (this.options.pedantic) {
            // split pedantic href and title
            const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

            if (link) {
              href = link[1];
              title = link[3];
            }
          } else {
            title = cap[3] ? cap[3].slice(1, -1) : '';
          }

          href = href.trim();
          if (/^</.test(href)) {
            if (this.options.pedantic && !(/>$/.test(trimmedUrl))) {
              // pedantic allows starting angle bracket without ending angle bracket
              href = href.slice(1);
            } else {
              href = href.slice(1, -1);
            }
          }
          return outputLink(cap, {
            href: href ? href.replace(this.rules.inline._escapes, '$1') : href,
            title: title ? title.replace(this.rules.inline._escapes, '$1') : title
          }, cap[0], this.lexer);
        }
      }

      reflink(src, links) {
        let cap;
        if ((cap = this.rules.inline.reflink.exec(src))
            || (cap = this.rules.inline.nolink.exec(src))) {
          let link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
          link = links[link.toLowerCase()];
          if (!link) {
            const text = cap[0].charAt(0);
            return {
              type: 'text',
              raw: text,
              text
            };
          }
          return outputLink(cap, link, cap[0], this.lexer);
        }
      }

      emStrong(src, maskedSrc, prevChar = '') {
        let match = this.rules.inline.emStrong.lDelim.exec(src);
        if (!match) return;

        // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
        if (match[3] && prevChar.match(/[\p{L}\p{N}]/u)) return;

        const nextChar = match[1] || match[2] || '';

        if (!nextChar || (nextChar && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar)))) {
          const lLength = match[0].length - 1;
          let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;

          const endReg = match[0][0] === '*' ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
          endReg.lastIndex = 0;

          // Clip maskedSrc to same section of string as src (move to lexer?)
          maskedSrc = maskedSrc.slice(-1 * src.length + lLength);

          while ((match = endReg.exec(maskedSrc)) != null) {
            rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];

            if (!rDelim) continue; // skip single * in __abc*abc__

            rLength = rDelim.length;

            if (match[3] || match[4]) { // found another Left Delim
              delimTotal += rLength;
              continue;
            } else if (match[5] || match[6]) { // either Left or Right Delim
              if (lLength % 3 && !((lLength + rLength) % 3)) {
                midDelimTotal += rLength;
                continue; // CommonMark Emphasis Rules 9-10
              }
            }

            delimTotal -= rLength;

            if (delimTotal > 0) continue; // Haven't found enough closing delimiters

            // Remove extra characters. *a*** -> *a*
            rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);

            const raw = src.slice(0, lLength + match.index + (match[0].length - rDelim.length) + rLength);

            // Create `em` if smallest delimiter has odd char count. *a***
            if (Math.min(lLength, rLength) % 2) {
              const text = raw.slice(1, -1);
              return {
                type: 'em',
                raw,
                text,
                tokens: this.lexer.inlineTokens(text)
              };
            }

            // Create 'strong' if smallest delimiter has even char count. **a***
            const text = raw.slice(2, -2);
            return {
              type: 'strong',
              raw,
              text,
              tokens: this.lexer.inlineTokens(text)
            };
          }
        }
      }

      codespan(src) {
        const cap = this.rules.inline.code.exec(src);
        if (cap) {
          let text = cap[2].replace(/\n/g, ' ');
          const hasNonSpaceChars = /[^ ]/.test(text);
          const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
          if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
            text = text.substring(1, text.length - 1);
          }
          text = escape(text, true);
          return {
            type: 'codespan',
            raw: cap[0],
            text
          };
        }
      }

      br(src) {
        const cap = this.rules.inline.br.exec(src);
        if (cap) {
          return {
            type: 'br',
            raw: cap[0]
          };
        }
      }

      del(src) {
        const cap = this.rules.inline.del.exec(src);
        if (cap) {
          return {
            type: 'del',
            raw: cap[0],
            text: cap[2],
            tokens: this.lexer.inlineTokens(cap[2])
          };
        }
      }

      autolink(src, mangle) {
        const cap = this.rules.inline.autolink.exec(src);
        if (cap) {
          let text, href;
          if (cap[2] === '@') {
            text = escape(this.options.mangle ? mangle(cap[1]) : cap[1]);
            href = 'mailto:' + text;
          } else {
            text = escape(cap[1]);
            href = text;
          }

          return {
            type: 'link',
            raw: cap[0],
            text,
            href,
            tokens: [
              {
                type: 'text',
                raw: text,
                text
              }
            ]
          };
        }
      }

      url(src, mangle) {
        let cap;
        if (cap = this.rules.inline.url.exec(src)) {
          let text, href;
          if (cap[2] === '@') {
            text = escape(this.options.mangle ? mangle(cap[0]) : cap[0]);
            href = 'mailto:' + text;
          } else {
            // do extended autolink path validation
            let prevCapZero;
            do {
              prevCapZero = cap[0];
              cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
            } while (prevCapZero !== cap[0]);
            text = escape(cap[0]);
            if (cap[1] === 'www.') {
              href = 'http://' + cap[0];
            } else {
              href = cap[0];
            }
          }
          return {
            type: 'link',
            raw: cap[0],
            text,
            href,
            tokens: [
              {
                type: 'text',
                raw: text,
                text
              }
            ]
          };
        }
      }

      inlineText(src, smartypants) {
        const cap = this.rules.inline.text.exec(src);
        if (cap) {
          let text;
          if (this.lexer.state.inRawBlock) {
            text = this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0])) : cap[0];
          } else {
            text = escape(this.options.smartypants ? smartypants(cap[0]) : cap[0]);
          }
          return {
            type: 'text',
            raw: cap[0],
            text
          };
        }
      }
    }

    /**
     * Block-Level Grammar
     */
    const block = {
      newline: /^(?: *(?:\n|$))+/,
      code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
      fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
      hr: /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
      heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
      blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
      list: /^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/,
      html: '^ {0,3}(?:' // optional indentation
        + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
        + '|comment[^\\n]*(\\n+|$)' // (2)
        + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
        + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
        + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
        + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (6)
        + '|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) open tag
        + '|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) closing tag
        + ')',
      def: /^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
      table: noopTest,
      lheading: /^((?:.|\n(?!\n))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
      // regex template, placeholders will be replaced according to different paragraph
      // interruption rules of commonmark and the original markdown spec:
      _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
      text: /^[^\n]+/
    };

    block._label = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
    block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
    block.def = edit(block.def)
      .replace('label', block._label)
      .replace('title', block._title)
      .getRegex();

    block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
    block.listItemStart = edit(/^( *)(bull) */)
      .replace('bull', block.bullet)
      .getRegex();

    block.list = edit(block.list)
      .replace(/bull/g, block.bullet)
      .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
      .replace('def', '\\n+(?=' + block.def.source + ')')
      .getRegex();

    block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
      + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
      + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
      + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
      + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
      + '|track|ul';
    block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
    block.html = edit(block.html, 'i')
      .replace('comment', block._comment)
      .replace('tag', block._tag)
      .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
      .getRegex();

    block.paragraph = edit(block._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('|table', '')
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();

    block.blockquote = edit(block.blockquote)
      .replace('paragraph', block.paragraph)
      .getRegex();

    /**
     * Normal Block Grammar
     */

    block.normal = merge({}, block);

    /**
     * GFM Block Grammar
     */

    block.gfm = merge({}, block.normal, {
      table: '^ *([^\\n ].*\\|.*)\\n' // Header
        + ' {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?' // Align
        + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
    });

    block.gfm.table = edit(block.gfm.table)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('blockquote', ' {0,3}>')
      .replace('code', ' {4}[^\\n]')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();

    block.gfm.paragraph = edit(block._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('table', block.gfm.table) // interrupt paragraphs with table
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();
    /**
     * Pedantic grammar (original John Gruber's loose markdown specification)
     */

    block.pedantic = merge({}, block.normal, {
      html: edit(
        '^ *(?:comment *(?:\\n|\\s*$)'
        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
        .replace('comment', block._comment)
        .replace(/tag/g, '(?!(?:'
          + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
          + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
          + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
        .getRegex(),
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
      heading: /^(#{1,6})(.*)(?:\n+|$)/,
      fences: noopTest, // fences not supported
      lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
      paragraph: edit(block.normal._paragraph)
        .replace('hr', block.hr)
        .replace('heading', ' *#{1,6} *[^\n]')
        .replace('lheading', block.lheading)
        .replace('blockquote', ' {0,3}>')
        .replace('|fences', '')
        .replace('|list', '')
        .replace('|html', '')
        .getRegex()
    });

    /**
     * Inline-Level Grammar
     */
    const inline = {
      escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
      autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
      url: noopTest,
      tag: '^comment'
        + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
        + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
        + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
        + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
        + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
      link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
      reflink: /^!?\[(label)\]\[(ref)\]/,
      nolink: /^!?\[(ref)\](?:\[\])?/,
      reflinkSearch: 'reflink|nolink(?!\\()',
      emStrong: {
        lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
        //        (1) and (2) can only be a Right Delimiter. (3) and (4) can only be Left.  (5) and (6) can be either Left or Right.
        //          () Skip orphan inside strong                                      () Consume to delim     (1) #***                (2) a***#, a***                             (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
        rDelimAst: /^(?:[^_*\\]|\\.)*?\_\_(?:[^_*\\]|\\.)*?\*(?:[^_*\\]|\\.)*?(?=\_\_)|(?:[^*\\]|\\.)+(?=[^*])|[punct_](\*+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|(?:[^punct*_\s\\]|\\.)(\*+)(?=[^punct*_\s])/,
        rDelimUnd: /^(?:[^_*\\]|\\.)*?\*\*(?:[^_*\\]|\\.)*?\_(?:[^_*\\]|\\.)*?(?=\*\*)|(?:[^_\\]|\\.)+(?=[^_])|[punct*](\_+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/ // ^- Not allowed for _
      },
      code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
      br: /^( {2,}|\\)\n(?!\s*$)/,
      del: noopTest,
      text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
      punctuation: /^([\spunctuation])/
    };

    // list of punctuation marks from CommonMark spec
    // without * and _ to handle the different emphasis markers * and _
    inline._punctuation = '!"#$%&\'()+\\-.,/:;<=>?@\\[\\]`^{|}~';
    inline.punctuation = edit(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();

    // sequences em should skip over [title](link), `code`, <html>
    inline.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
    // lookbehind is not available on Safari as of version 16
    // inline.escapedEmSt = /(?<=(?:^|[^\\)(?:\\[^])*)\\[*_]/g;
    inline.escapedEmSt = /(?:^|[^\\])(?:\\\\)*\\[*_]/g;

    inline._comment = edit(block._comment).replace('(?:-->|$)', '-->').getRegex();

    inline.emStrong.lDelim = edit(inline.emStrong.lDelim)
      .replace(/punct/g, inline._punctuation)
      .getRegex();

    inline.emStrong.rDelimAst = edit(inline.emStrong.rDelimAst, 'g')
      .replace(/punct/g, inline._punctuation)
      .getRegex();

    inline.emStrong.rDelimUnd = edit(inline.emStrong.rDelimUnd, 'g')
      .replace(/punct/g, inline._punctuation)
      .getRegex();

    inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

    inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
    inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
    inline.autolink = edit(inline.autolink)
      .replace('scheme', inline._scheme)
      .replace('email', inline._email)
      .getRegex();

    inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

    inline.tag = edit(inline.tag)
      .replace('comment', inline._comment)
      .replace('attribute', inline._attribute)
      .getRegex();

    inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
    inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
    inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

    inline.link = edit(inline.link)
      .replace('label', inline._label)
      .replace('href', inline._href)
      .replace('title', inline._title)
      .getRegex();

    inline.reflink = edit(inline.reflink)
      .replace('label', inline._label)
      .replace('ref', block._label)
      .getRegex();

    inline.nolink = edit(inline.nolink)
      .replace('ref', block._label)
      .getRegex();

    inline.reflinkSearch = edit(inline.reflinkSearch, 'g')
      .replace('reflink', inline.reflink)
      .replace('nolink', inline.nolink)
      .getRegex();

    /**
     * Normal Inline Grammar
     */

    inline.normal = merge({}, inline);

    /**
     * Pedantic Inline Grammar
     */

    inline.pedantic = merge({}, inline.normal, {
      strong: {
        start: /^__|\*\*/,
        middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        endAst: /\*\*(?!\*)/g,
        endUnd: /__(?!_)/g
      },
      em: {
        start: /^_|\*/,
        middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
        endAst: /\*(?!\*)/g,
        endUnd: /_(?!_)/g
      },
      link: edit(/^!?\[(label)\]\((.*?)\)/)
        .replace('label', inline._label)
        .getRegex(),
      reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
        .replace('label', inline._label)
        .getRegex()
    });

    /**
     * GFM Inline Grammar
     */

    inline.gfm = merge({}, inline.normal, {
      escape: edit(inline.escape).replace('])', '~|])').getRegex(),
      _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
      url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
      _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
      del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
      text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
    });

    inline.gfm.url = edit(inline.gfm.url, 'i')
      .replace('email', inline.gfm._extended_email)
      .getRegex();
    /**
     * GFM + Line Breaks Inline Grammar
     */

    inline.breaks = merge({}, inline.gfm, {
      br: edit(inline.br).replace('{2,}', '*').getRegex(),
      text: edit(inline.gfm.text)
        .replace('\\b_', '\\b_| {2,}\\n')
        .replace(/\{2,\}/g, '*')
        .getRegex()
    });

    /**
     * smartypants text replacement
     * @param {string} text
     */
    function smartypants(text) {
      return text
        // em-dashes
        .replace(/---/g, '\u2014')
        // en-dashes
        .replace(/--/g, '\u2013')
        // opening singles
        .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
        // closing singles & apostrophes
        .replace(/'/g, '\u2019')
        // opening doubles
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
        // closing doubles
        .replace(/"/g, '\u201d')
        // ellipses
        .replace(/\.{3}/g, '\u2026');
    }

    /**
     * mangle email addresses
     * @param {string} text
     */
    function mangle(text) {
      let out = '',
        i,
        ch;

      const l = text.length;
      for (i = 0; i < l; i++) {
        ch = text.charCodeAt(i);
        if (Math.random() > 0.5) {
          ch = 'x' + ch.toString(16);
        }
        out += '&#' + ch + ';';
      }

      return out;
    }

    /**
     * Block Lexer
     */
    class Lexer {
      constructor(options) {
        this.tokens = [];
        this.tokens.links = Object.create(null);
        this.options = options || defaults;
        this.options.tokenizer = this.options.tokenizer || new Tokenizer();
        this.tokenizer = this.options.tokenizer;
        this.tokenizer.options = this.options;
        this.tokenizer.lexer = this;
        this.inlineQueue = [];
        this.state = {
          inLink: false,
          inRawBlock: false,
          top: true
        };

        const rules = {
          block: block.normal,
          inline: inline.normal
        };

        if (this.options.pedantic) {
          rules.block = block.pedantic;
          rules.inline = inline.pedantic;
        } else if (this.options.gfm) {
          rules.block = block.gfm;
          if (this.options.breaks) {
            rules.inline = inline.breaks;
          } else {
            rules.inline = inline.gfm;
          }
        }
        this.tokenizer.rules = rules;
      }

      /**
       * Expose Rules
       */
      static get rules() {
        return {
          block,
          inline
        };
      }

      /**
       * Static Lex Method
       */
      static lex(src, options) {
        const lexer = new Lexer(options);
        return lexer.lex(src);
      }

      /**
       * Static Lex Inline Method
       */
      static lexInline(src, options) {
        const lexer = new Lexer(options);
        return lexer.inlineTokens(src);
      }

      /**
       * Preprocessing
       */
      lex(src) {
        src = src
          .replace(/\r\n|\r/g, '\n');

        this.blockTokens(src, this.tokens);

        let next;
        while (next = this.inlineQueue.shift()) {
          this.inlineTokens(next.src, next.tokens);
        }

        return this.tokens;
      }

      /**
       * Lexing
       */
      blockTokens(src, tokens = []) {
        if (this.options.pedantic) {
          src = src.replace(/\t/g, '    ').replace(/^ +$/gm, '');
        } else {
          src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
            return leading + '    '.repeat(tabs.length);
          });
        }

        let token, lastToken, cutSrc, lastParagraphClipped;

        while (src) {
          if (this.options.extensions
            && this.options.extensions.block
            && this.options.extensions.block.some((extTokenizer) => {
              if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                return true;
              }
              return false;
            })) {
            continue;
          }

          // newline
          if (token = this.tokenizer.space(src)) {
            src = src.substring(token.raw.length);
            if (token.raw.length === 1 && tokens.length > 0) {
              // if there's a single \n as a spacer, it's terminating the last line,
              // so move it there so that we don't get unecessary paragraph tags
              tokens[tokens.length - 1].raw += '\n';
            } else {
              tokens.push(token);
            }
            continue;
          }

          // code
          if (token = this.tokenizer.code(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            // An indented code block cannot interrupt a paragraph.
            if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.text;
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          // fences
          if (token = this.tokenizer.fences(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // heading
          if (token = this.tokenizer.heading(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // hr
          if (token = this.tokenizer.hr(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // blockquote
          if (token = this.tokenizer.blockquote(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // list
          if (token = this.tokenizer.list(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // html
          if (token = this.tokenizer.html(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // def
          if (token = this.tokenizer.def(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.raw;
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else if (!this.tokens.links[token.tag]) {
              this.tokens.links[token.tag] = {
                href: token.href,
                title: token.title
              };
            }
            continue;
          }

          // table (gfm)
          if (token = this.tokenizer.table(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // lheading
          if (token = this.tokenizer.lheading(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // top-level paragraph
          // prevent paragraph consuming extensions by clipping 'src' to extension start
          cutSrc = src;
          if (this.options.extensions && this.options.extensions.startBlock) {
            let startIndex = Infinity;
            const tempSrc = src.slice(1);
            let tempStart;
            this.options.extensions.startBlock.forEach(function(getStartIndex) {
              tempStart = getStartIndex.call({ lexer: this }, tempSrc);
              if (typeof tempStart === 'number' && tempStart >= 0) { startIndex = Math.min(startIndex, tempStart); }
            });
            if (startIndex < Infinity && startIndex >= 0) {
              cutSrc = src.substring(0, startIndex + 1);
            }
          }
          if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
            lastToken = tokens[tokens.length - 1];
            if (lastParagraphClipped && lastToken.type === 'paragraph') {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.text;
              this.inlineQueue.pop();
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            lastParagraphClipped = (cutSrc.length !== src.length);
            src = src.substring(token.raw.length);
            continue;
          }

          // text
          if (token = this.tokenizer.text(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === 'text') {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.text;
              this.inlineQueue.pop();
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          if (src) {
            const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }

        this.state.top = true;
        return tokens;
      }

      inline(src, tokens = []) {
        this.inlineQueue.push({ src, tokens });
        return tokens;
      }

      /**
       * Lexing/Compiling
       */
      inlineTokens(src, tokens = []) {
        let token, lastToken, cutSrc;

        // String with links masked to avoid interference with em and strong
        let maskedSrc = src;
        let match;
        let keepPrevChar, prevChar;

        // Mask out reflinks
        if (this.tokens.links) {
          const links = Object.keys(this.tokens.links);
          if (links.length > 0) {
            while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
              if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
                maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
              }
            }
          }
        }
        // Mask out other blocks
        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
        }

        // Mask out escaped em & strong delimiters
        while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index + match[0].length - 2) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
          this.tokenizer.rules.inline.escapedEmSt.lastIndex--;
        }

        while (src) {
          if (!keepPrevChar) {
            prevChar = '';
          }
          keepPrevChar = false;

          // extensions
          if (this.options.extensions
            && this.options.extensions.inline
            && this.options.extensions.inline.some((extTokenizer) => {
              if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                return true;
              }
              return false;
            })) {
            continue;
          }

          // escape
          if (token = this.tokenizer.escape(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // tag
          if (token = this.tokenizer.tag(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token.type === 'text' && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          // link
          if (token = this.tokenizer.link(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // reflink, nolink
          if (token = this.tokenizer.reflink(src, this.tokens.links)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token.type === 'text' && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          // em & strong
          if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // code
          if (token = this.tokenizer.codespan(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // br
          if (token = this.tokenizer.br(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // del (gfm)
          if (token = this.tokenizer.del(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // autolink
          if (token = this.tokenizer.autolink(src, mangle)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // url (gfm)
          if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // text
          // prevent inlineText consuming extensions by clipping 'src' to extension start
          cutSrc = src;
          if (this.options.extensions && this.options.extensions.startInline) {
            let startIndex = Infinity;
            const tempSrc = src.slice(1);
            let tempStart;
            this.options.extensions.startInline.forEach(function(getStartIndex) {
              tempStart = getStartIndex.call({ lexer: this }, tempSrc);
              if (typeof tempStart === 'number' && tempStart >= 0) { startIndex = Math.min(startIndex, tempStart); }
            });
            if (startIndex < Infinity && startIndex >= 0) {
              cutSrc = src.substring(0, startIndex + 1);
            }
          }
          if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
            src = src.substring(token.raw.length);
            if (token.raw.slice(-1) !== '_') { // Track prevChar before string of ____ started
              prevChar = token.raw.slice(-1);
            }
            keepPrevChar = true;
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          if (src) {
            const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }

        return tokens;
      }
    }

    /**
     * Renderer
     */
    class Renderer {
      constructor(options) {
        this.options = options || defaults;
      }

      code(code, infostring, escaped) {
        const lang = (infostring || '').match(/\S*/)[0];
        if (this.options.highlight) {
          const out = this.options.highlight(code, lang);
          if (out != null && out !== code) {
            escaped = true;
            code = out;
          }
        }

        code = code.replace(/\n$/, '') + '\n';

        if (!lang) {
          return '<pre><code>'
            + (escaped ? code : escape(code, true))
            + '</code></pre>\n';
        }

        return '<pre><code class="'
          + this.options.langPrefix
          + escape(lang)
          + '">'
          + (escaped ? code : escape(code, true))
          + '</code></pre>\n';
      }

      /**
       * @param {string} quote
       */
      blockquote(quote) {
        return `<blockquote>\n${quote}</blockquote>\n`;
      }

      html(html) {
        return html;
      }

      /**
       * @param {string} text
       * @param {string} level
       * @param {string} raw
       * @param {any} slugger
       */
      heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
          const id = this.options.headerPrefix + slugger.slug(raw);
          return `<h${level} id="${id}">${text}</h${level}>\n`;
        }

        // ignore IDs
        return `<h${level}>${text}</h${level}>\n`;
      }

      hr() {
        return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
      }

      list(body, ordered, start) {
        const type = ordered ? 'ol' : 'ul',
          startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
        return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
      }

      /**
       * @param {string} text
       */
      listitem(text) {
        return `<li>${text}</li>\n`;
      }

      checkbox(checked) {
        return '<input '
          + (checked ? 'checked="" ' : '')
          + 'disabled="" type="checkbox"'
          + (this.options.xhtml ? ' /' : '')
          + '> ';
      }

      /**
       * @param {string} text
       */
      paragraph(text) {
        return `<p>${text}</p>\n`;
      }

      /**
       * @param {string} header
       * @param {string} body
       */
      table(header, body) {
        if (body) body = `<tbody>${body}</tbody>`;

        return '<table>\n'
          + '<thead>\n'
          + header
          + '</thead>\n'
          + body
          + '</table>\n';
      }

      /**
       * @param {string} content
       */
      tablerow(content) {
        return `<tr>\n${content}</tr>\n`;
      }

      tablecell(content, flags) {
        const type = flags.header ? 'th' : 'td';
        const tag = flags.align
          ? `<${type} align="${flags.align}">`
          : `<${type}>`;
        return tag + content + `</${type}>\n`;
      }

      /**
       * span level renderer
       * @param {string} text
       */
      strong(text) {
        return `<strong>${text}</strong>`;
      }

      /**
       * @param {string} text
       */
      em(text) {
        return `<em>${text}</em>`;
      }

      /**
       * @param {string} text
       */
      codespan(text) {
        return `<code>${text}</code>`;
      }

      br() {
        return this.options.xhtml ? '<br/>' : '<br>';
      }

      /**
       * @param {string} text
       */
      del(text) {
        return `<del>${text}</del>`;
      }

      /**
       * @param {string} href
       * @param {string} title
       * @param {string} text
       */
      link(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        let out = '<a href="' + href + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
      }

      /**
       * @param {string} href
       * @param {string} title
       * @param {string} text
       */
      image(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }

        let out = `<img src="${href}" alt="${text}"`;
        if (title) {
          out += ` title="${title}"`;
        }
        out += this.options.xhtml ? '/>' : '>';
        return out;
      }

      text(text) {
        return text;
      }
    }

    /**
     * TextRenderer
     * returns only the textual part of the token
     */
    class TextRenderer {
      // no need for block level renderers
      strong(text) {
        return text;
      }

      em(text) {
        return text;
      }

      codespan(text) {
        return text;
      }

      del(text) {
        return text;
      }

      html(text) {
        return text;
      }

      text(text) {
        return text;
      }

      link(href, title, text) {
        return '' + text;
      }

      image(href, title, text) {
        return '' + text;
      }

      br() {
        return '';
      }
    }

    /**
     * Slugger generates header id
     */
    class Slugger {
      constructor() {
        this.seen = {};
      }

      /**
       * @param {string} value
       */
      serialize(value) {
        return value
          .toLowerCase()
          .trim()
          // remove html tags
          .replace(/<[!\/a-z].*?>/ig, '')
          // remove unwanted chars
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
          .replace(/\s/g, '-');
      }

      /**
       * Finds the next safe (unique) slug to use
       * @param {string} originalSlug
       * @param {boolean} isDryRun
       */
      getNextSafeSlug(originalSlug, isDryRun) {
        let slug = originalSlug;
        let occurenceAccumulator = 0;
        if (this.seen.hasOwnProperty(slug)) {
          occurenceAccumulator = this.seen[originalSlug];
          do {
            occurenceAccumulator++;
            slug = originalSlug + '-' + occurenceAccumulator;
          } while (this.seen.hasOwnProperty(slug));
        }
        if (!isDryRun) {
          this.seen[originalSlug] = occurenceAccumulator;
          this.seen[slug] = 0;
        }
        return slug;
      }

      /**
       * Convert string to unique id
       * @param {object} [options]
       * @param {boolean} [options.dryrun] Generates the next unique slug without
       * updating the internal accumulator.
       */
      slug(value, options = {}) {
        const slug = this.serialize(value);
        return this.getNextSafeSlug(slug, options.dryrun);
      }
    }

    /**
     * Parsing & Compiling
     */
    class Parser {
      constructor(options) {
        this.options = options || defaults;
        this.options.renderer = this.options.renderer || new Renderer();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.textRenderer = new TextRenderer();
        this.slugger = new Slugger();
      }

      /**
       * Static Parse Method
       */
      static parse(tokens, options) {
        const parser = new Parser(options);
        return parser.parse(tokens);
      }

      /**
       * Static Parse Inline Method
       */
      static parseInline(tokens, options) {
        const parser = new Parser(options);
        return parser.parseInline(tokens);
      }

      /**
       * Parse Loop
       */
      parse(tokens, top = true) {
        let out = '',
          i,
          j,
          k,
          l2,
          l3,
          row,
          cell,
          header,
          body,
          token,
          ordered,
          start,
          loose,
          itemBody,
          item,
          checked,
          task,
          checkbox,
          ret;

        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token = tokens[i];

          // Run any renderer extensions
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
            ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
            if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(token.type)) {
              out += ret || '';
              continue;
            }
          }

          switch (token.type) {
            case 'space': {
              continue;
            }
            case 'hr': {
              out += this.renderer.hr();
              continue;
            }
            case 'heading': {
              out += this.renderer.heading(
                this.parseInline(token.tokens),
                token.depth,
                unescape(this.parseInline(token.tokens, this.textRenderer)),
                this.slugger);
              continue;
            }
            case 'code': {
              out += this.renderer.code(token.text,
                token.lang,
                token.escaped);
              continue;
            }
            case 'table': {
              header = '';

              // header
              cell = '';
              l2 = token.header.length;
              for (j = 0; j < l2; j++) {
                cell += this.renderer.tablecell(
                  this.parseInline(token.header[j].tokens),
                  { header: true, align: token.align[j] }
                );
              }
              header += this.renderer.tablerow(cell);

              body = '';
              l2 = token.rows.length;
              for (j = 0; j < l2; j++) {
                row = token.rows[j];

                cell = '';
                l3 = row.length;
                for (k = 0; k < l3; k++) {
                  cell += this.renderer.tablecell(
                    this.parseInline(row[k].tokens),
                    { header: false, align: token.align[k] }
                  );
                }

                body += this.renderer.tablerow(cell);
              }
              out += this.renderer.table(header, body);
              continue;
            }
            case 'blockquote': {
              body = this.parse(token.tokens);
              out += this.renderer.blockquote(body);
              continue;
            }
            case 'list': {
              ordered = token.ordered;
              start = token.start;
              loose = token.loose;
              l2 = token.items.length;

              body = '';
              for (j = 0; j < l2; j++) {
                item = token.items[j];
                checked = item.checked;
                task = item.task;

                itemBody = '';
                if (item.task) {
                  checkbox = this.renderer.checkbox(checked);
                  if (loose) {
                    if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
                      item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                      if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                        item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                      }
                    } else {
                      item.tokens.unshift({
                        type: 'text',
                        text: checkbox
                      });
                    }
                  } else {
                    itemBody += checkbox;
                  }
                }

                itemBody += this.parse(item.tokens, loose);
                body += this.renderer.listitem(itemBody, task, checked);
              }

              out += this.renderer.list(body, ordered, start);
              continue;
            }
            case 'html': {
              // TODO parse inline content if parameter markdown=1
              out += this.renderer.html(token.text);
              continue;
            }
            case 'paragraph': {
              out += this.renderer.paragraph(this.parseInline(token.tokens));
              continue;
            }
            case 'text': {
              body = token.tokens ? this.parseInline(token.tokens) : token.text;
              while (i + 1 < l && tokens[i + 1].type === 'text') {
                token = tokens[++i];
                body += '\n' + (token.tokens ? this.parseInline(token.tokens) : token.text);
              }
              out += top ? this.renderer.paragraph(body) : body;
              continue;
            }

            default: {
              const errMsg = 'Token with "' + token.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }

        return out;
      }

      /**
       * Parse Inline Tokens
       */
      parseInline(tokens, renderer) {
        renderer = renderer || this.renderer;
        let out = '',
          i,
          token,
          ret;

        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token = tokens[i];

          // Run any renderer extensions
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
            ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
            if (ret !== false || !['escape', 'html', 'link', 'image', 'strong', 'em', 'codespan', 'br', 'del', 'text'].includes(token.type)) {
              out += ret || '';
              continue;
            }
          }

          switch (token.type) {
            case 'escape': {
              out += renderer.text(token.text);
              break;
            }
            case 'html': {
              out += renderer.html(token.text);
              break;
            }
            case 'link': {
              out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
              break;
            }
            case 'image': {
              out += renderer.image(token.href, token.title, token.text);
              break;
            }
            case 'strong': {
              out += renderer.strong(this.parseInline(token.tokens, renderer));
              break;
            }
            case 'em': {
              out += renderer.em(this.parseInline(token.tokens, renderer));
              break;
            }
            case 'codespan': {
              out += renderer.codespan(token.text);
              break;
            }
            case 'br': {
              out += renderer.br();
              break;
            }
            case 'del': {
              out += renderer.del(this.parseInline(token.tokens, renderer));
              break;
            }
            case 'text': {
              out += renderer.text(token.text);
              break;
            }
            default: {
              const errMsg = 'Token with "' + token.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }
        return out;
      }
    }

    /**
     * Marked
     */
    function marked(src, opt, callback) {
      // throw error in case of non string input
      if (typeof src === 'undefined' || src === null) {
        throw new Error('marked(): input parameter is undefined or null');
      }
      if (typeof src !== 'string') {
        throw new Error('marked(): input parameter is of type '
          + Object.prototype.toString.call(src) + ', string expected');
      }

      if (typeof opt === 'function') {
        callback = opt;
        opt = null;
      }

      opt = merge({}, marked.defaults, opt || {});
      checkSanitizeDeprecation(opt);

      if (callback) {
        const highlight = opt.highlight;
        let tokens;

        try {
          tokens = Lexer.lex(src, opt);
        } catch (e) {
          return callback(e);
        }

        const done = function(err) {
          let out;

          if (!err) {
            try {
              if (opt.walkTokens) {
                marked.walkTokens(tokens, opt.walkTokens);
              }
              out = Parser.parse(tokens, opt);
            } catch (e) {
              err = e;
            }
          }

          opt.highlight = highlight;

          return err
            ? callback(err)
            : callback(null, out);
        };

        if (!highlight || highlight.length < 3) {
          return done();
        }

        delete opt.highlight;

        if (!tokens.length) return done();

        let pending = 0;
        marked.walkTokens(tokens, function(token) {
          if (token.type === 'code') {
            pending++;
            setTimeout(() => {
              highlight(token.text, token.lang, function(err, code) {
                if (err) {
                  return done(err);
                }
                if (code != null && code !== token.text) {
                  token.text = code;
                  token.escaped = true;
                }

                pending--;
                if (pending === 0) {
                  done();
                }
              });
            }, 0);
          }
        });

        if (pending === 0) {
          done();
        }

        return;
      }

      function onError(e) {
        e.message += '\nPlease report this to https://github.com/markedjs/marked.';
        if (opt.silent) {
          return '<p>An error occurred:</p><pre>'
            + escape(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }

      try {
        const tokens = Lexer.lex(src, opt);
        if (opt.walkTokens) {
          if (opt.async) {
            return Promise.all(marked.walkTokens(tokens, opt.walkTokens))
              .then(() => {
                return Parser.parse(tokens, opt);
              })
              .catch(onError);
          }
          marked.walkTokens(tokens, opt.walkTokens);
        }
        return Parser.parse(tokens, opt);
      } catch (e) {
        onError(e);
      }
    }

    /**
     * Options
     */

    marked.options =
    marked.setOptions = function(opt) {
      merge(marked.defaults, opt);
      changeDefaults(marked.defaults);
      return marked;
    };

    marked.getDefaults = getDefaults;

    marked.defaults = defaults;

    /**
     * Use Extension
     */

    marked.use = function(...args) {
      const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };

      args.forEach((pack) => {
        // copy options to new object
        const opts = merge({}, pack);

        // set async to true if it was set to true before
        opts.async = marked.defaults.async || opts.async;

        // ==-- Parse "addon" extensions --== //
        if (pack.extensions) {
          pack.extensions.forEach((ext) => {
            if (!ext.name) {
              throw new Error('extension name required');
            }
            if (ext.renderer) { // Renderer extensions
              const prevRenderer = extensions.renderers[ext.name];
              if (prevRenderer) {
                // Replace extension with func to run new extension but fall back if false
                extensions.renderers[ext.name] = function(...args) {
                  let ret = ext.renderer.apply(this, args);
                  if (ret === false) {
                    ret = prevRenderer.apply(this, args);
                  }
                  return ret;
                };
              } else {
                extensions.renderers[ext.name] = ext.renderer;
              }
            }
            if (ext.tokenizer) { // Tokenizer Extensions
              if (!ext.level || (ext.level !== 'block' && ext.level !== 'inline')) {
                throw new Error("extension level must be 'block' or 'inline'");
              }
              if (extensions[ext.level]) {
                extensions[ext.level].unshift(ext.tokenizer);
              } else {
                extensions[ext.level] = [ext.tokenizer];
              }
              if (ext.start) { // Function to check for start of token
                if (ext.level === 'block') {
                  if (extensions.startBlock) {
                    extensions.startBlock.push(ext.start);
                  } else {
                    extensions.startBlock = [ext.start];
                  }
                } else if (ext.level === 'inline') {
                  if (extensions.startInline) {
                    extensions.startInline.push(ext.start);
                  } else {
                    extensions.startInline = [ext.start];
                  }
                }
              }
            }
            if (ext.childTokens) { // Child tokens to be visited by walkTokens
              extensions.childTokens[ext.name] = ext.childTokens;
            }
          });
          opts.extensions = extensions;
        }

        // ==-- Parse "overwrite" extensions --== //
        if (pack.renderer) {
          const renderer = marked.defaults.renderer || new Renderer();
          for (const prop in pack.renderer) {
            const prevRenderer = renderer[prop];
            // Replace renderer with func to run extension, but fall back if false
            renderer[prop] = (...args) => {
              let ret = pack.renderer[prop].apply(renderer, args);
              if (ret === false) {
                ret = prevRenderer.apply(renderer, args);
              }
              return ret;
            };
          }
          opts.renderer = renderer;
        }
        if (pack.tokenizer) {
          const tokenizer = marked.defaults.tokenizer || new Tokenizer();
          for (const prop in pack.tokenizer) {
            const prevTokenizer = tokenizer[prop];
            // Replace tokenizer with func to run extension, but fall back if false
            tokenizer[prop] = (...args) => {
              let ret = pack.tokenizer[prop].apply(tokenizer, args);
              if (ret === false) {
                ret = prevTokenizer.apply(tokenizer, args);
              }
              return ret;
            };
          }
          opts.tokenizer = tokenizer;
        }

        // ==-- Parse WalkTokens extensions --== //
        if (pack.walkTokens) {
          const walkTokens = marked.defaults.walkTokens;
          opts.walkTokens = function(token) {
            let values = [];
            values.push(pack.walkTokens.call(this, token));
            if (walkTokens) {
              values = values.concat(walkTokens.call(this, token));
            }
            return values;
          };
        }

        marked.setOptions(opts);
      });
    };

    /**
     * Run callback for every token
     */

    marked.walkTokens = function(tokens, callback) {
      let values = [];
      for (const token of tokens) {
        values = values.concat(callback.call(marked, token));
        switch (token.type) {
          case 'table': {
            for (const cell of token.header) {
              values = values.concat(marked.walkTokens(cell.tokens, callback));
            }
            for (const row of token.rows) {
              for (const cell of row) {
                values = values.concat(marked.walkTokens(cell.tokens, callback));
              }
            }
            break;
          }
          case 'list': {
            values = values.concat(marked.walkTokens(token.items, callback));
            break;
          }
          default: {
            if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token.type]) { // Walk any extensions
              marked.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
                values = values.concat(marked.walkTokens(token[childTokens], callback));
              });
            } else if (token.tokens) {
              values = values.concat(marked.walkTokens(token.tokens, callback));
            }
          }
        }
      }
      return values;
    };

    /**
     * Parse Inline
     * @param {string} src
     */
    marked.parseInline = function(src, opt) {
      // throw error in case of non string input
      if (typeof src === 'undefined' || src === null) {
        throw new Error('marked.parseInline(): input parameter is undefined or null');
      }
      if (typeof src !== 'string') {
        throw new Error('marked.parseInline(): input parameter is of type '
          + Object.prototype.toString.call(src) + ', string expected');
      }

      opt = merge({}, marked.defaults, opt || {});
      checkSanitizeDeprecation(opt);

      try {
        const tokens = Lexer.lexInline(src, opt);
        if (opt.walkTokens) {
          marked.walkTokens(tokens, opt.walkTokens);
        }
        return Parser.parseInline(tokens, opt);
      } catch (e) {
        e.message += '\nPlease report this to https://github.com/markedjs/marked.';
        if (opt.silent) {
          return '<p>An error occurred:</p><pre>'
            + escape(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }
    };

    /**
     * Expose
     */
    marked.Parser = Parser;
    marked.parser = Parser.parse;
    marked.Renderer = Renderer;
    marked.TextRenderer = TextRenderer;
    marked.Lexer = Lexer;
    marked.lexer = Lexer.lex;
    marked.Tokenizer = Tokenizer;
    marked.Slugger = Slugger;
    marked.parse = marked;

    marked.options;
    marked.setOptions;
    marked.use;
    marked.walkTokens;
    marked.parseInline;
    Parser.parse;
    Lexer.lex;

    const key = {};

    /* node_modules\svelte-markdown\src\renderers\Heading.svelte generated by Svelte v3.55.0 */

    function create_else_block$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*raw*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*raw*/ 2) set_data(t, /*raw*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (26:22) 
    function create_if_block_5(ctx) {
    	let h6;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			h6 = element("h6");
    			if (default_slot) default_slot.c();
    			attr(h6, "id", /*id*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, h6, anchor);

    			if (default_slot) {
    				default_slot.m(h6, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(h6, "id", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h6);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (24:22) 
    function create_if_block_4(ctx) {
    	let h5;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			h5 = element("h5");
    			if (default_slot) default_slot.c();
    			attr(h5, "id", /*id*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, h5, anchor);

    			if (default_slot) {
    				default_slot.m(h5, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(h5, "id", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h5);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (22:22) 
    function create_if_block_3(ctx) {
    	let h4;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			h4 = element("h4");
    			if (default_slot) default_slot.c();
    			attr(h4, "id", /*id*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, h4, anchor);

    			if (default_slot) {
    				default_slot.m(h4, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(h4, "id", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h4);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (20:22) 
    function create_if_block_2(ctx) {
    	let h3;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			h3 = element("h3");
    			if (default_slot) default_slot.c();
    			attr(h3, "id", /*id*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);

    			if (default_slot) {
    				default_slot.m(h3, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(h3, "id", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (18:22) 
    function create_if_block_1(ctx) {
    	let h2;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			h2 = element("h2");
    			if (default_slot) default_slot.c();
    			attr(h2, "id", /*id*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);

    			if (default_slot) {
    				default_slot.m(h2, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(h2, "id", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (16:0) {#if depth === 1}
    function create_if_block$3(ctx) {
    	let h1;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			h1 = element("h1");
    			if (default_slot) default_slot.c();
    			attr(h1, "id", /*id*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);

    			if (default_slot) {
    				default_slot.m(h1, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(h1, "id", /*id*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$_(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	const if_block_creators = [
    		create_if_block$3,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4,
    		create_if_block_5,
    		create_else_block$3
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*depth*/ ctx[0] === 1) return 0;
    		if (/*depth*/ ctx[0] === 2) return 1;
    		if (/*depth*/ ctx[0] === 3) return 2;
    		if (/*depth*/ ctx[0] === 4) return 3;
    		if (/*depth*/ ctx[0] === 5) return 4;
    		if (/*depth*/ ctx[0] === 6) return 5;
    		return 6;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$C($$self, $$props, $$invalidate) {
    	let id;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { depth } = $$props;
    	let { raw } = $$props;
    	let { text } = $$props;
    	const { slug, getOptions } = getContext(key);
    	const options = getOptions();

    	$$self.$$set = $$props => {
    		if ('depth' in $$props) $$invalidate(0, depth = $$props.depth);
    		if ('raw' in $$props) $$invalidate(1, raw = $$props.raw);
    		if ('text' in $$props) $$invalidate(3, text = $$props.text);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*text*/ 8) {
    			$$invalidate(2, id = options.headerIds
    			? options.headerPrefix + slug(text)
    			: undefined);
    		}
    	};

    	return [depth, raw, id, text, $$scope, slots];
    }

    class Heading extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$C, create_fragment$_, safe_not_equal, { depth: 0, raw: 1, text: 3 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Paragraph.svelte generated by Svelte v3.55.0 */

    function create_fragment$Z(ctx) {
    	let p;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			p = element("p");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);

    			if (default_slot) {
    				default_slot.m(p, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$B($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Paragraph extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$B, create_fragment$Z, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Text.svelte generated by Svelte v3.55.0 */

    function create_fragment$Y(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$A($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { text } = $$props;
    	let { raw } = $$props;

    	$$self.$$set = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    		if ('raw' in $$props) $$invalidate(1, raw = $$props.raw);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [text, raw, $$scope, slots];
    }

    class Text extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$A, create_fragment$Y, safe_not_equal, { text: 0, raw: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Image.svelte generated by Svelte v3.55.0 */

    function create_fragment$X(ctx) {
    	let img;
    	let img_src_value;

    	return {
    		c() {
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = /*href*/ ctx[0])) attr(img, "src", img_src_value);
    			attr(img, "title", /*title*/ ctx[1]);
    			attr(img, "alt", /*text*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*href*/ 1 && !src_url_equal(img.src, img_src_value = /*href*/ ctx[0])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*title*/ 2) {
    				attr(img, "title", /*title*/ ctx[1]);
    			}

    			if (dirty & /*text*/ 4) {
    				attr(img, "alt", /*text*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(img);
    		}
    	};
    }

    function instance$z($$self, $$props, $$invalidate) {
    	let { href = '' } = $$props;
    	let { title = undefined } = $$props;
    	let { text = '' } = $$props;

    	$$self.$$set = $$props => {
    		if ('href' in $$props) $$invalidate(0, href = $$props.href);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('text' in $$props) $$invalidate(2, text = $$props.text);
    	};

    	return [href, title, text];
    }

    class Image extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$z, create_fragment$X, safe_not_equal, { href: 0, title: 1, text: 2 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Link.svelte generated by Svelte v3.55.0 */

    function create_fragment$W(ctx) {
    	let a;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr(a, "href", /*href*/ ctx[0]);
    			attr(a, "title", /*title*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*href*/ 1) {
    				attr(a, "href", /*href*/ ctx[0]);
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr(a, "title", /*title*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { href = '' } = $$props;
    	let { title = undefined } = $$props;

    	$$self.$$set = $$props => {
    		if ('href' in $$props) $$invalidate(0, href = $$props.href);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [href, title, $$scope, slots];
    }

    class Link extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$y, create_fragment$W, safe_not_equal, { href: 0, title: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Em.svelte generated by Svelte v3.55.0 */

    function create_fragment$V(ctx) {
    	let em;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			em = element("em");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, em, anchor);

    			if (default_slot) {
    				default_slot.m(em, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(em);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$x($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Em extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$x, create_fragment$V, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Del.svelte generated by Svelte v3.55.0 */

    function create_fragment$U(ctx) {
    	let del;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			del = element("del");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, del, anchor);

    			if (default_slot) {
    				default_slot.m(del, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(del);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Del extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$w, create_fragment$U, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Codespan.svelte generated by Svelte v3.55.0 */

    function create_fragment$T(ctx) {
    	let code;
    	let t_value = /*raw*/ ctx[0].replace(/`/g, '') + "";
    	let t;

    	return {
    		c() {
    			code = element("code");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, code, anchor);
    			append(code, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*raw*/ 1 && t_value !== (t_value = /*raw*/ ctx[0].replace(/`/g, '') + "")) set_data(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(code);
    		}
    	};
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let { raw } = $$props;

    	$$self.$$set = $$props => {
    		if ('raw' in $$props) $$invalidate(0, raw = $$props.raw);
    	};

    	return [raw];
    }

    class Codespan extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$v, create_fragment$T, safe_not_equal, { raw: 0 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Strong.svelte generated by Svelte v3.55.0 */

    function create_fragment$S(ctx) {
    	let strong;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			strong = element("strong");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, strong, anchor);

    			if (default_slot) {
    				default_slot.m(strong, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(strong);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Strong extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$u, create_fragment$S, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Table.svelte generated by Svelte v3.55.0 */

    function create_fragment$R(ctx) {
    	let table;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			table = element("table");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);

    			if (default_slot) {
    				default_slot.m(table, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(table);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Table extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$t, create_fragment$R, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableHead.svelte generated by Svelte v3.55.0 */

    function create_fragment$Q(ctx) {
    	let thead;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			thead = element("thead");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, thead, anchor);

    			if (default_slot) {
    				default_slot.m(thead, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(thead);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TableHead extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$s, create_fragment$Q, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableBody.svelte generated by Svelte v3.55.0 */

    function create_fragment$P(ctx) {
    	let tbody;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			tbody = element("tbody");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, tbody, anchor);

    			if (default_slot) {
    				default_slot.m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tbody);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TableBody extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$r, create_fragment$P, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableRow.svelte generated by Svelte v3.55.0 */

    function create_fragment$O(ctx) {
    	let tr;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			tr = element("tr");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);

    			if (default_slot) {
    				default_slot.m(tr, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TableRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$q, create_fragment$O, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableCell.svelte generated by Svelte v3.55.0 */

    function create_else_block$2(ctx) {
    	let td;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			td = element("td");
    			if (default_slot) default_slot.c();
    			attr(td, "align", /*align*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, td, anchor);

    			if (default_slot) {
    				default_slot.m(td, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*align*/ 2) {
    				attr(td, "align", /*align*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(td);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (6:0) {#if header}
    function create_if_block$2(ctx) {
    	let th;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			th = element("th");
    			if (default_slot) default_slot.c();
    			attr(th, "align", /*align*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);

    			if (default_slot) {
    				default_slot.m(th, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*align*/ 2) {
    				attr(th, "align", /*align*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(th);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$N(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*header*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { header } = $$props;
    	let { align } = $$props;

    	$$self.$$set = $$props => {
    		if ('header' in $$props) $$invalidate(0, header = $$props.header);
    		if ('align' in $$props) $$invalidate(1, align = $$props.align);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [header, align, $$scope, slots];
    }

    class TableCell extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$p, create_fragment$N, safe_not_equal, { header: 0, align: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\List.svelte generated by Svelte v3.55.0 */

    function create_else_block$1(ctx) {
    	let ul;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			ul = element("ul");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			if (default_slot) {
    				default_slot.m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (6:0) {#if ordered}
    function create_if_block$1(ctx) {
    	let ol;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			ol = element("ol");
    			if (default_slot) default_slot.c();
    			attr(ol, "start", /*start*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, ol, anchor);

    			if (default_slot) {
    				default_slot.m(ol, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*start*/ 2) {
    				attr(ol, "start", /*start*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ol);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$M(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*ordered*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { ordered } = $$props;
    	let { start } = $$props;

    	$$self.$$set = $$props => {
    		if ('ordered' in $$props) $$invalidate(0, ordered = $$props.ordered);
    		if ('start' in $$props) $$invalidate(1, start = $$props.start);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [ordered, start, $$scope, slots];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$o, create_fragment$M, safe_not_equal, { ordered: 0, start: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\ListItem.svelte generated by Svelte v3.55.0 */

    function create_fragment$L(ctx) {
    	let li;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			li = element("li");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);

    			if (default_slot) {
    				default_slot.m(li, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class ListItem extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$n, create_fragment$L, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Hr.svelte generated by Svelte v3.55.0 */

    function create_fragment$K(ctx) {
    	let hr;

    	return {
    		c() {
    			hr = element("hr");
    		},
    		m(target, anchor) {
    			insert(target, hr, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(hr);
    		}
    	};
    }

    class Hr extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$K, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Html.svelte generated by Svelte v3.55.0 */

    function create_fragment$J(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m(target, anchor) {
    			html_tag.m(/*text*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) html_tag.p(/*text*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { text } = $$props;

    	$$self.$$set = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	return [text];
    }

    class Html extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$m, create_fragment$J, safe_not_equal, { text: 0 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Blockquote.svelte generated by Svelte v3.55.0 */

    function create_fragment$I(ctx) {
    	let blockquote;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			blockquote = element("blockquote");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, blockquote, anchor);

    			if (default_slot) {
    				default_slot.m(blockquote, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(blockquote);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Blockquote extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$l, create_fragment$I, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Code.svelte generated by Svelte v3.55.0 */

    function create_fragment$H(ctx) {
    	let pre;
    	let code;
    	let t;

    	return {
    		c() {
    			pre = element("pre");
    			code = element("code");
    			t = text(/*text*/ ctx[1]);
    			attr(pre, "class", /*lang*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, pre, anchor);
    			append(pre, code);
    			append(code, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*text*/ 2) set_data(t, /*text*/ ctx[1]);

    			if (dirty & /*lang*/ 1) {
    				attr(pre, "class", /*lang*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(pre);
    		}
    	};
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { lang } = $$props;
    	let { text } = $$props;

    	$$self.$$set = $$props => {
    		if ('lang' in $$props) $$invalidate(0, lang = $$props.lang);
    		if ('text' in $$props) $$invalidate(1, text = $$props.text);
    	};

    	return [lang, text];
    }

    class Code extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$k, create_fragment$H, safe_not_equal, { lang: 0, text: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Br.svelte generated by Svelte v3.55.0 */

    function create_fragment$G(ctx) {
    	let br;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			br = element("br");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, br, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(br);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Br extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$j, create_fragment$G, safe_not_equal, {});
    	}
    }

    const defaultRenderers = {
      heading: Heading,
      paragraph: Paragraph,
      text: Text,
      image: Image,
      link: Link,
      em: Em,
      strong: Strong,
      codespan: Codespan,
      del: Del,
      table: Table,
      tablehead: TableHead,
      tablebody: TableBody,
      tablerow: TableRow,
      tablecell: TableCell,
      list: List,
      orderedlistitem: null,
      unorderedlistitem: null,
      listitem: ListItem,
      hr: Hr,
      html: Html,
      blockquote: Blockquote,
      code: Code,
      br: Br,
    };
    const defaultOptions = {
      baseUrl: null,
      breaks: false,
      gfm: true,
      headerIds: true,
      headerPrefix: '',
      highlight: null,
      langPrefix: 'language-',
      mangle: true,
      pedantic: false,
      renderer: null,
      sanitize: false,
      sanitizer: null,
      silent: false,
      smartLists: false,
      smartypants: false,
      tokenizer: null,
      xhtml: false,
    };

    /* node_modules\svelte-markdown\src\SvelteMarkdown.svelte generated by Svelte v3.55.0 */

    function create_fragment$F(ctx) {
    	let parser;
    	let current;

    	parser = new Parser$1({
    			props: {
    				tokens: /*tokens*/ ctx[0],
    				renderers: /*combinedRenderers*/ ctx[1]
    			}
    		});

    	return {
    		c() {
    			create_component(parser.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(parser, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const parser_changes = {};
    			if (dirty & /*tokens*/ 1) parser_changes.tokens = /*tokens*/ ctx[0];
    			if (dirty & /*combinedRenderers*/ 2) parser_changes.renderers = /*combinedRenderers*/ ctx[1];
    			parser.$set(parser_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(parser.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(parser.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(parser, detaching);
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let preprocessed;
    	let slugger;
    	let combinedOptions;
    	let combinedRenderers;
    	let { source = [] } = $$props;
    	let { renderers = {} } = $$props;
    	let { options = {} } = $$props;
    	let { isInline = false } = $$props;
    	const dispatch = createEventDispatcher();
    	let tokens;
    	let lexer;
    	let mounted;

    	setContext(key, {
    		slug: val => slugger ? slugger.slug(val) : '',
    		getOptions: () => combinedOptions
    	});

    	onMount(() => {
    		$$invalidate(7, mounted = true);
    	});

    	$$self.$$set = $$props => {
    		if ('source' in $$props) $$invalidate(2, source = $$props.source);
    		if ('renderers' in $$props) $$invalidate(3, renderers = $$props.renderers);
    		if ('options' in $$props) $$invalidate(4, options = $$props.options);
    		if ('isInline' in $$props) $$invalidate(5, isInline = $$props.isInline);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*source*/ 4) {
    			$$invalidate(8, preprocessed = Array.isArray(source));
    		}

    		if ($$self.$$.dirty & /*source*/ 4) {
    			slugger = source ? new Slugger() : undefined;
    		}

    		if ($$self.$$.dirty & /*options*/ 16) {
    			$$invalidate(9, combinedOptions = { ...defaultOptions, ...options });
    		}

    		if ($$self.$$.dirty & /*preprocessed, source, combinedOptions, isInline, lexer, tokens*/ 869) {
    			if (preprocessed) {
    				$$invalidate(0, tokens = source);
    			} else {
    				$$invalidate(6, lexer = new Lexer(combinedOptions));

    				$$invalidate(0, tokens = isInline
    				? lexer.inlineTokens(source)
    				: lexer.lex(source));

    				dispatch('parsed', { tokens });
    			}
    		}

    		if ($$self.$$.dirty & /*renderers*/ 8) {
    			$$invalidate(1, combinedRenderers = { ...defaultRenderers, ...renderers });
    		}

    		if ($$self.$$.dirty & /*mounted, preprocessed, tokens*/ 385) {
    			mounted && !preprocessed && dispatch('parsed', { tokens });
    		}
    	};

    	return [
    		tokens,
    		combinedRenderers,
    		source,
    		renderers,
    		options,
    		isInline,
    		lexer,
    		mounted,
    		preprocessed,
    		combinedOptions
    	];
    }

    class SvelteMarkdown extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$i, create_fragment$F, safe_not_equal, {
    			source: 2,
    			renderers: 3,
    			options: 4,
    			isInline: 5
    		});
    	}
    }

    /* site\src\app\markdown.svelte generated by Svelte v3.55.0 */

    function create_fragment$E(ctx) {
    	let div;
    	let markdown;
    	let current;
    	markdown = new SvelteMarkdown({ props: { source: /*docs*/ ctx[0] } });

    	return {
    		c() {
    			div = element("div");
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(markdown, div, null);
    			/*div_binding*/ ctx[2](div);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const markdown_changes = {};
    			if (dirty & /*docs*/ 1) markdown_changes.source = /*docs*/ ctx[0];
    			markdown.$set(markdown_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(markdown);
    			/*div_binding*/ ctx[2](null);
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { docs } = $$props;
    	let markdownContainer = null;

    	onMount(() => {
    		const codez = markdownContainer.querySelectorAll("pre");

    		for (const code of codez) {
    			hljs.highlightBlock(code);
    		}

    		const anchors = markdownContainer.querySelectorAll("a");

    		for (const anchor of anchors) {
    			anchor.target = "_blank";
    		}
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			markdownContainer = $$value;
    			$$invalidate(1, markdownContainer);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('docs' in $$props) $$invalidate(0, docs = $$props.docs);
    	};

    	return [docs, markdownContainer, div_binding];
    }

    class Markdown_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$E, safe_not_equal, { docs: 0 });
    	}
    }

    var docs$z = "# Svelte Doric\r\n\r\nCollection of UI components for Svelte to help create Single Page Applications\r\neasily and reliably. It was written from the ground up to be a standalone\r\nlibrary to keep installation and usage as simple as possible. Right now the\r\ncomponents must be used with the provided baseline css and theme components,\r\nbut that will likely change in the future once I figure out how to decouple\r\nsome of those things without breaking what I have.\r\n\r\nInspired by similar libraries in React and Svelte like MUI CSS and Smelte,\r\nSvelte Doric is based on material design concepts, but deviates in a few areas\r\nto try something new (and hopefully interesting/useful). Development is mainly\r\ndriven by my and my friend's experiences in building web apps, so hopefully\r\nthis makes it stay on track and not add complexity needlessly.\r\n\r\n[Component Preview Site](https://axel669.github.io/svelte-doric/)\r\n\r\n## Installation\r\n\r\n```bash\r\nnpm add svelte-doric\r\n```\r\n\r\n### Rollup\r\n\r\nIt is recommended to use the `emitCss: false` option within the rollup svelte\r\nconfig to make everything work nicely.\r\n\r\n```js\r\nimport svelte from \"rollup-plugin-svelte\"\r\nimport commonjs from \"@rollup/plugin-commonjs\"\r\nimport resolve from \"@rollup/plugin-node-resolve\"\r\n\r\nexport default {\r\n    input: \"src/main.js\",\r\n    output: {\r\n        file: `build/app.js`,\r\n        format: \"iife\",\r\n    },\r\n    plugins: [\r\n        svelte({\r\n            emitCss: false,\r\n        }),\r\n        resolve(),\r\n        commonjs(),\r\n    ]\r\n}\r\n```\r\n\r\nThat's it. That's all it takes to get things installed and going.\r\n\r\n## Getting Started\r\n\r\nSvelte Doric has set of baseline css that it needs to ensure everything works\r\nwell and behaves consistently between browsers, all of which is bundled into\r\nthe `Baseline` component, and rendered by the `AppStyle` component. It ships\r\nwith 3 themes: `LightTheme`, `DarkTheme`, and `TronTheme`, which can be swapped\r\nout at anytime during runtime safely, and extended into custom themes.\r\n\r\n> If `AppStyle` is not used, nothing will look correct, and some things will not\r\n> behave as expected in some browsers (usually Safari).\r\n\r\n```svelte\r\n<script>\r\n    import {\r\n        AppStyle,\r\n        Baseline as baseline,\r\n        TronTheme as theme,\r\n    } from \"svelte-doric\"\r\n</script>\r\n\r\n<AppStyle {baseline} {theme} />\r\n```\r\n";

    var changelog = "## 1.9.1\n- renamed Appbar and Titlebar\n- changed Select style\n- Select no longer crashes with no selected value by default\n- updated all uses of on:tap to on:click in docs and demo site\n- removed adornment component, updated components for adornment styles\n    - Button\n    - Flex\n    - Grid\n    - Text\n    - TextInput\n- TextInput error prop now sets extra text when non null\n- TextInput validation prop added, works with error automatically\n- TextInput transform prop added, works with validation\n\n## 1.9.0\n\n### Utils\n- added onChange\n- added grid util\n- made hash store settable\n\n### Components\n- removed custom event code (no longer needed)\n- removed ripple effect\n    - replaced with pure css effect for performance\n- removed Checkbox\n- removed Switch\n- added Toggle component\n- converted on:tap to on:click in all components\n- fix AppBar adornment recoloring\n- ControlDrawer and Drawer heights fixed\n- rebuilt TextInput to modify layout and remove number of nodes required\n- List and Table body elements now get paginated item list as prop\n- Grid now has areas prop for grid-template-areas\n    - many components now have col, row, and area props to interact with grids\n\n### Site\n- made component list scroll independant of theme selection\n- component buttons now act as links (support for ctrl+click too)\n";

    /* site\src\app\home.svelte generated by Svelte v3.55.0 */

    function create_fragment$D(ctx) {
    	let markdown0;
    	let t;
    	let markdown1;
    	let current;
    	markdown0 = new Markdown_1({ props: { docs: docs$z } });
    	markdown1 = new Markdown_1({ props: { docs: changelog } });

    	return {
    		c() {
    			create_component(markdown0.$$.fragment);
    			t = space();
    			create_component(markdown1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(markdown1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown0.$$.fragment, local);
    			transition_in(markdown1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown0.$$.fragment, local);
    			transition_out(markdown1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown0, detaching);
    			if (detaching) detach(t);
    			destroy_component(markdown1, detaching);
    		}
    	};
    }

    class Home extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$D, safe_not_equal, {});
    	}
    }

    var docs$y = "A container that allows button-like interaction with content without\r\na lot of the button overhead and styling.\r\n\r\n## Props\r\nThis component doesn't take any props.\r\n\r\n## Events\r\n- click\r\n\r\n## Usage\r\n```svelte\r\n<ActionArea on:click class>\r\n    Content\r\n</ActionArea>\r\n```\r\n";

    /* site\src\component\action-area.svelte generated by Svelte v3.55.0 */

    function create_default_slot_1$g(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (15:0) <Paper card>
    function create_default_slot$p(ctx) {
    	let actionarea;
    	let current;

    	actionarea = new Action_area$1({
    			props: {
    				$$slots: { default: [create_default_slot_1$g] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(actionarea.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(actionarea, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const actionarea_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				actionarea_changes.$$scope = { dirty, ctx };
    			}

    			actionarea.$set(actionarea_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionarea.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionarea.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(actionarea, detaching);
    		}
    	};
    }

    function create_fragment$C(ctx) {
    	let h1;
    	let t1;
    	let paper;
    	let t2;
    	let markdown;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				$$slots: { default: [create_default_slot$p] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$y } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "ActionArea";
    			t1 = space();
    			create_component(paper.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(paper, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const paper_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(paper, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Action_area extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$C, safe_not_equal, {});
    	}
    }

    var docs$x = "The `adorn` prop allows some components to be marked as being used for\r\nadornments within other components. Setting to `true` will cause some components\r\nto resize to fit better as adornments. Setting to `\"no-reskin\"` will prevent the\r\n`Appbar` component from applying its color overrides to the component (and its\r\nchildren for layouts).\r\n\r\n## Usage\r\n```svelte\r\n<TextInput label=\"Cost\">\r\n    <Text adorn slot=\"start\">\r\n        $\r\n    </Text>\r\n</TextInput>\r\n\r\n<AppBar>\r\n    <Button on:tap={openMenu} adorn=\"no-reskin\" slot=\"menu\">\r\n        <Icon name=\"menu\" />\r\n    </Button>\r\n</AppBar>\r\n```\r\n";

    /* site\src\component\adornment.svelte generated by Svelte v3.55.0 */

    function create_fragment$B(ctx) {
    	let h1;
    	let t1;
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$x } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Adornments";
    			t1 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$B, safe_not_equal, {});
    	}
    }

    var docs$w = "Sets up the style for the app.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `baseline` | _Component_ | `null` | An element that sets up the baseline CSS for the app. See the `Baseline` component for additional information\r\n| `theme` | _Component_ | `null` | An element that sets up the theme values for the app. See `Theme` for additional information\r\n\r\n## Usage\r\n```svelte\r\n<AppStyle baseline={Baseline} theme={DarkTheme} />\r\n```\r\n";

    /* site\src\component\app-style.svelte generated by Svelte v3.55.0 */

    function create_fragment$A(ctx) {
    	let h1;
    	let t1;
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$w } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "AppStyle";
    			t1 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class App_style extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$A, safe_not_equal, {});
    	}
    }

    /* site\src\component\screen\subscreen2.svelte generated by Svelte v3.55.0 */

    function create_default_slot_8$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Close Entire Stack");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (40:8) <TabPanel {tabGroup} value="left">
    function create_default_slot_7$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Acceptable");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (43:8) <TabPanel {tabGroup} value="right">
    function create_default_slot_6$7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("The better side of Twix");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (36:4) <Paper card square>
    function create_default_slot_5$9(ctx) {
    	let button;
    	let t0;
    	let tabpanel0;
    	let t1;
    	let tabpanel1;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_8$3] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*click_handler_1*/ ctx[5]);

    	tabpanel0 = new Tab_panel({
    			props: {
    				tabGroup: /*tabGroup*/ ctx[1],
    				value: "left",
    				$$slots: { default: [create_default_slot_7$5] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel1 = new Tab_panel({
    			props: {
    				tabGroup: /*tabGroup*/ ctx[1],
    				value: "right",
    				$$slots: { default: [create_default_slot_6$7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			const tabpanel0_changes = {};
    			if (dirty & /*tabGroup*/ 2) tabpanel0_changes.tabGroup = /*tabGroup*/ ctx[1];

    			if (dirty & /*$$scope*/ 128) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};
    			if (dirty & /*tabGroup*/ 2) tabpanel1_changes.tabGroup = /*tabGroup*/ ctx[1];

    			if (dirty & /*$$scope*/ 128) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    			if (detaching) detach(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(tabpanel1, detaching);
    		}
    	};
    }

    // (22:0) <Screen bind:this={screen}>
    function create_default_slot_4$a(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				square: true,
    				$$slots: { default: [create_default_slot_5$9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, tabGroup, screen*/ 131) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    // (23:4) <Appbar slot="title">
    function create_default_slot_3$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Subscreen 2: Electric Boogaloo");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (26:8) <Button on:click={() => screen.close()} adorn slot="action">
    function create_default_slot_2$e(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "close" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (26:8) 
    function create_action_slot$5(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "action",
    				$$slots: { default: [create_default_slot_2$e] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*click_handler*/ ctx[4]);

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (31:12) <Text>
    function create_default_slot_1$f(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("regular text?");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (30:8) <Flex padding="0px" adorn="no-reskin" slot="extension">
    function create_default_slot$o(ctx) {
    	let text_1;
    	let t;
    	let tabs;
    	let updating_tabGroup;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_1$f] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[3](value);
    	}

    	let tabs_props = { options: /*options*/ ctx[2] };

    	if (/*tabGroup*/ ctx[1] !== void 0) {
    		tabs_props.tabGroup = /*tabGroup*/ ctx[1];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, 'tabGroup', tabs_tabGroup_binding, /*tabGroup*/ ctx[1]));

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t = space();
    			create_component(tabs.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*tabGroup*/ 2) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tabGroup*/ ctx[1];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(tabs, detaching);
    		}
    	};
    }

    // (30:8) 
    function create_extension_slot$2(ctx) {
    	let flex;
    	let current;

    	flex = new Flex$1({
    			props: {
    				padding: "0px",
    				adorn: "no-reskin",
    				slot: "extension",
    				$$slots: { default: [create_default_slot$o] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flex.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flex, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flex_changes = {};

    			if (dirty & /*$$scope, tabGroup*/ 130) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flex.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flex.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flex, detaching);
    		}
    	};
    }

    // (23:4) 
    function create_title_slot$3(ctx) {
    	let appbar;
    	let current;

    	appbar = new Appbar$1({
    			props: {
    				slot: "title",
    				$$slots: {
    					extension: [create_extension_slot$2],
    					action: [create_action_slot$5],
    					default: [create_default_slot_3$a]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(appbar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appbar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const appbar_changes = {};

    			if (dirty & /*$$scope, tabGroup, screen*/ 131) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appbar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appbar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appbar, detaching);
    		}
    	};
    }

    function create_fragment$z(ctx) {
    	let screen_1;
    	let current;

    	let screen_1_props = {
    		$$slots: {
    			title: [create_title_slot$3],
    			default: [create_default_slot_4$a]
    		},
    		$$scope: { ctx }
    	};

    	screen_1 = new Screen$1({ props: screen_1_props });
    	/*screen_1_binding*/ ctx[6](screen_1);

    	return {
    		c() {
    			create_component(screen_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(screen_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const screen_1_changes = {};

    			if (dirty & /*$$scope, tabGroup, screen*/ 131) {
    				screen_1_changes.$$scope = { dirty, ctx };
    			}

    			screen_1.$set(screen_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(screen_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(screen_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*screen_1_binding*/ ctx[6](null);
    			destroy_component(screen_1, detaching);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let screen = null;
    	let tabGroup = "left";
    	const options = [{ label: "Left Twix", value: "left" }, { label: "Right Twix", value: "right" }];

    	function tabs_tabGroup_binding(value) {
    		tabGroup = value;
    		$$invalidate(1, tabGroup);
    	}

    	const click_handler = () => screen.close();
    	const click_handler_1 = () => screen.closeAll();

    	function screen_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			screen = $$value;
    			$$invalidate(0, screen);
    		});
    	}

    	return [
    		screen,
    		tabGroup,
    		options,
    		tabs_tabGroup_binding,
    		click_handler,
    		click_handler_1,
    		screen_1_binding
    	];
    }

    class Subscreen2 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$g, create_fragment$z, safe_not_equal, {});
    	}
    }

    /* site\src\component\screen\subscreen.svelte generated by Svelte v3.55.0 */

    function create_default_slot_6$6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Open Another Subscreen");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (38:8) <TabPanel {tabGroup} value="left">
    function create_default_slot_5$8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Acceptable");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (41:8) <TabPanel {tabGroup} value="right">
    function create_default_slot_4$9(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("The better side of Twix");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (34:4) <Paper card square>
    function create_default_slot_3$9(ctx) {
    	let button;
    	let t0;
    	let tabpanel0;
    	let t1;
    	let tabpanel1;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_6$6] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*click_handler_1*/ ctx[5]);

    	tabpanel0 = new Tab_panel({
    			props: {
    				tabGroup: /*tabGroup*/ ctx[1],
    				value: "left",
    				$$slots: { default: [create_default_slot_5$8] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel1 = new Tab_panel({
    			props: {
    				tabGroup: /*tabGroup*/ ctx[1],
    				value: "right",
    				$$slots: { default: [create_default_slot_4$9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			const tabpanel0_changes = {};
    			if (dirty & /*tabGroup*/ 2) tabpanel0_changes.tabGroup = /*tabGroup*/ ctx[1];

    			if (dirty & /*$$scope*/ 128) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};
    			if (dirty & /*tabGroup*/ 2) tabpanel1_changes.tabGroup = /*tabGroup*/ ctx[1];

    			if (dirty & /*$$scope*/ 128) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    			if (detaching) detach(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(tabpanel1, detaching);
    		}
    	};
    }

    // (23:0) <Screen bind:this={screen}>
    function create_default_slot_2$d(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				square: true,
    				$$slots: { default: [create_default_slot_3$9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, tabGroup, screen*/ 131) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    // (24:4) <Appbar slot="title">
    function create_default_slot_1$e(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Subscreen \\o/");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (27:8) <Button on:click={() => screen.close()} adorn slot="action">
    function create_default_slot$n(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "close" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (27:8) 
    function create_action_slot$4(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "action",
    				$$slots: { default: [create_default_slot$n] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*click_handler*/ ctx[4]);

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 128) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (31:8) 
    function create_extension_slot$1(ctx) {
    	let tabs;
    	let updating_tabGroup;
    	let current;

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[3](value);
    	}

    	let tabs_props = {
    		options: /*options*/ ctx[2],
    		adorn: "no-reskin",
    		slot: "extension"
    	};

    	if (/*tabGroup*/ ctx[1] !== void 0) {
    		tabs_props.tabGroup = /*tabGroup*/ ctx[1];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, 'tabGroup', tabs_tabGroup_binding, /*tabGroup*/ ctx[1]));

    	return {
    		c() {
    			create_component(tabs.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*tabGroup*/ 2) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tabGroup*/ ctx[1];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tabs, detaching);
    		}
    	};
    }

    // (24:4) 
    function create_title_slot$2(ctx) {
    	let appbar;
    	let current;

    	appbar = new Appbar$1({
    			props: {
    				slot: "title",
    				$$slots: {
    					extension: [create_extension_slot$1],
    					action: [create_action_slot$4],
    					default: [create_default_slot_1$e]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(appbar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appbar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const appbar_changes = {};

    			if (dirty & /*$$scope, tabGroup, screen*/ 131) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appbar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appbar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appbar, detaching);
    		}
    	};
    }

    function create_fragment$y(ctx) {
    	let screen_1;
    	let current;

    	let screen_1_props = {
    		$$slots: {
    			title: [create_title_slot$2],
    			default: [create_default_slot_2$d]
    		},
    		$$scope: { ctx }
    	};

    	screen_1 = new Screen$1({ props: screen_1_props });
    	/*screen_1_binding*/ ctx[6](screen_1);

    	return {
    		c() {
    			create_component(screen_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(screen_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const screen_1_changes = {};

    			if (dirty & /*$$scope, tabGroup, screen*/ 131) {
    				screen_1_changes.$$scope = { dirty, ctx };
    			}

    			screen_1.$set(screen_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(screen_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(screen_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*screen_1_binding*/ ctx[6](null);
    			destroy_component(screen_1, detaching);
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let screen = null;
    	let tabGroup = "left";
    	const options = [{ label: "Left Twix", value: "left" }, { label: "Right Twix", value: "right" }];

    	function tabs_tabGroup_binding(value) {
    		tabGroup = value;
    		$$invalidate(1, tabGroup);
    	}

    	const click_handler = () => screen.close();
    	const click_handler_1 = () => screen.openStack(Subscreen2);

    	function screen_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			screen = $$value;
    			$$invalidate(0, screen);
    		});
    	}

    	return [
    		screen,
    		tabGroup,
    		options,
    		tabs_tabGroup_binding,
    		click_handler,
    		click_handler_1,
    		screen_1_binding
    	];
    }

    class Subscreen extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$f, create_fragment$y, safe_not_equal, {});
    	}
    }

    var screen$1 = writable(null);

    var docs$v = "Component for making title bars within Screen components.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `center` | _boolean_ | `false` | If `false` the `Appbar` text will be left-aligned by default. If `true` the text will be centered.\r\n\r\n## Slots\r\n- menu\r\n- action\r\n- extension\r\n\r\n## Usage\r\n```svelte\r\n<Screen>\r\n    <Appbar slot=\"title\">\r\n        Title\r\n    </Appbar>\r\n</Screen>\r\n\r\n<Screen>\r\n    <Appbar slot=\"title\">\r\n        Other Title\r\n\r\n        <Button adorn slot=\"menu\">\r\n            <Icon name=\"bars\" />\r\n        </Button>\r\n    </Appbar>\r\n</Screen>\r\n```\r\n";

    /* site\src\component\appbar.svelte generated by Svelte v3.55.0 */

    function create_default_slot$m(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Open Subscreen");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$x(ctx) {
    	let h1;
    	let t1;
    	let button;
    	let t2;
    	let markdown;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$m] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*click_handler*/ ctx[1]);
    	markdown = new Markdown_1({ props: { docs: docs$v } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Screen";
    			t1 = space();
    			create_component(button.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(button, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(button, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $screen;
    	component_subscribe($$self, screen$1, $$value => $$invalidate(0, $screen = $$value));
    	const click_handler = () => $screen.openStack(Subscreen);
    	return [$screen, click_handler];
    }

    class Appbar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$e, create_fragment$x, safe_not_equal, {});
    	}
    }

    var docs$u = "Small icon-like component that supports images and text as content.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `background` | _string_ | | Background color for the avatar. shows behind text or behind cropped portions of images\r\n| `image` | _string_ | | URL for an image to show in the avatar\r\n| `imageSize` | _string_ | `\"contain\"` | The fit function that should be used if the avatar is showing an image\r\n| `size` | _string_ | `\"36px\"` | The size of the avatar element (width & height). Value needs to include css units\r\n| `textColor` | _string_ | | Text color if the avatar is showing text\r\n\r\n## Usage\r\n```svelte\r\n<Avatar size background textColor>\r\n    Avatar Text\r\n</Avatar>\r\n\r\n<Avatar size image imageSize />\r\n```\r\n";

    /* site\src\component\avatar.svelte generated by Svelte v3.55.0 */

    function create_default_slot$l(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("SD");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$w(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let avatar0;
    	let t2;
    	let avatar1;
    	let t3;
    	let markdown;
    	let current;

    	avatar0 = new Avatar({
    			props: {
    				$$slots: { default: [create_default_slot$l] },
    				$$scope: { ctx }
    			}
    		});

    	avatar1 = new Avatar({
    			props: {
    				image: "https://axel669.net/images/alia-icon.png"
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$u } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Avatar";
    			t1 = space();
    			div = element("div");
    			create_component(avatar0.$$.fragment);
    			t2 = space();
    			create_component(avatar1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(avatar0, div, null);
    			append(div, t2);
    			mount_component(avatar1, div, null);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const avatar0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				avatar0_changes.$$scope = { dirty, ctx };
    			}

    			avatar0.$set(avatar0_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(avatar0.$$.fragment, local);
    			transition_in(avatar1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(avatar0.$$.fragment, local);
    			transition_out(avatar1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			destroy_component(avatar0);
    			destroy_component(avatar1);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Avatar_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$w, safe_not_equal, {});
    	}
    }

    var docs$t = "Creates a small badge over content.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `anchor` | _object_ | | The anchor point to place the badge at. Use the `top` and `left` properties and include CSS units\r\n| `color` | _string_ | `\"default\"` | The theme color to use for the badge. See the colors section of [theme](./theme.md) for details\r\n| `translate` | _object_ | | The translation to apply to the badge. Use the `x` and `y` properties and include CSS units\r\n\r\n## Slots\r\n- content\r\n\r\n## Usage\r\n```svelte\r\n<Badge anchor color translate>\r\n    Content to show badge over\r\n    <div slot=\"content\">\r\n        10\r\n    </div>\r\n</Badge>\r\n```\r\n";

    /* site\src\component\badge.svelte generated by Svelte v3.55.0 */

    function create_default_slot$k(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Some Content";
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (17:8) 
    function create_content_slot$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "5";
    			attr(div, "slot", "content");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$v(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let badge;
    	let t2;
    	let markdown;
    	let current;

    	badge = new Badge({
    			props: {
    				$$slots: {
    					content: [create_content_slot$1],
    					default: [create_default_slot$k]
    				},
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$t } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Badge";
    			t1 = space();
    			div = element("div");
    			create_component(badge.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(badge, div, null);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const badge_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				badge_changes.$$scope = { dirty, ctx };
    			}

    			badge.$set(badge_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(badge.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(badge.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			destroy_component(badge);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Badge_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$v, safe_not_equal, {});
    	}
    }

    var docs$s = "Sets up the baseline CSS for an application.\r\n\r\nInstead of taking in props, a baseline component renders style tags and adds\r\nexternal fonts using `svelte:head`\r\n\r\n`Baseline` can be extended by rendering it as a child and rendering\r\nadditional style tags afterwards in the htmlx.\r\n\r\n## Usage\r\n```svelte\r\n<AppStyle {baseline} {theme} />\r\n```\r\n\r\n## Extending\r\n```svelte\r\n<script>\r\n    import { Baseline, css } from \"svelte-doric\"\r\n\r\n    const extendedCSS = css`\r\n        body {\r\n            background-image: url(some-image.jpg);\r\n        }\r\n    `\r\n</script>\r\n\r\n<Baseline />\r\n{@html extendedCSS}\r\n```\r\n";

    /* site\src\component\baseline.svelte generated by Svelte v3.55.0 */

    function create_fragment$u(ctx) {
    	let h1;
    	let t1;
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$s } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Baseline";
    			t1 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Baseline extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$u, safe_not_equal, {});
    	}
    }

    var docs$r = "## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)\r\n| `buttonColor` | _CSS String_ | | Custom color for the button outside of the standard colors\r\n| `color` | _string_ | `\"default\"` | The coloration of the `Button`. Valid options are `\"default\"`, `\"primary\"`, `\"secondary\"`, and `\"danger\"`\r\n| `compact` | _boolean_ | | If true, default padding will be half the normal size\r\n| `disabled` | _boolean_ | | If true, button will not react to user interaction\r\n| `round` | _string_ | | Makes the corners of the button more or less round. Include CSS units for size\r\n| `square` | _boolean_ | | If true, button will not have rounded corners\r\n| `variant` | _string_ | `\"normal\"` | `Button` style variation. Valid options are: `\"normal\"`, `\"outline\"`, `\"fill\"`\r\n\r\n## Events\r\n- click\r\n\r\n## Usage\r\n```svelte\r\n<Button>\r\n    Button Content\r\n</Button>\r\n\r\n<Button>\r\n    <Flex>\r\n        Flex Content\r\n    </Flex>\r\n</Button>\r\n```\r\n";

    /* site\src\component\button.svelte generated by Svelte v3.55.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (24:20) <Text align="center">
    function create_default_slot_10(ctx) {
    	let t_value = /*variant*/ ctx[2] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (25:20) <Text align="center">
    function create_default_slot_9$1(ctx) {
    	let t_value = /*color*/ ctx[5] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (23:16) <Flex>
    function create_default_slot_8$2(ctx) {
    	let text0;
    	let t;
    	let text1;
    	let current;

    	text0 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_9$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text0.$$.fragment);
    			t = space();
    			create_component(text1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(text1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text0, detaching);
    			if (detaching) detach(t);
    			destroy_component(text1, detaching);
    		}
    	};
    }

    // (22:12) <Button {variant} {color}>
    function create_default_slot_7$4(ctx) {
    	let flex;
    	let current;

    	flex = new Flex$1({
    			props: {
    				$$slots: { default: [create_default_slot_8$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flex.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flex, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flex_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flex.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flex.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flex, detaching);
    		}
    	};
    }

    // (21:8) {#each buttonColors as color}
    function create_each_block_2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[2],
    				color: /*color*/ ctx[5],
    				$$slots: { default: [create_default_slot_7$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (32:20) <Text align="center">
    function create_default_slot_6$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("disabled");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (33:20) <Text align="center">
    function create_default_slot_5$7(ctx) {
    	let t_value = /*variant*/ ctx[2] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (34:20) <Text align="center">
    function create_default_slot_4$8(ctx) {
    	let t_value = /*color*/ ctx[5] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (31:16) <Flex>
    function create_default_slot_3$8(ctx) {
    	let text0;
    	let t0;
    	let text1;
    	let t1;
    	let text2;
    	let current;

    	text0 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_6$5] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_5$7] },
    				$$scope: { ctx }
    			}
    		});

    	text2 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_4$8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text0.$$.fragment);
    			t0 = space();
    			create_component(text1.$$.fragment);
    			t1 = space();
    			create_component(text2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(text1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(text2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    			const text2_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				text2_changes.$$scope = { dirty, ctx };
    			}

    			text2.$set(text2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			transition_in(text2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			transition_out(text2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(text1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(text2, detaching);
    		}
    	};
    }

    // (30:12) <Button {variant} {color} disabled>
    function create_default_slot_2$c(ctx) {
    	let flex;
    	let current;

    	flex = new Flex$1({
    			props: {
    				$$slots: { default: [create_default_slot_3$8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flex.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flex, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flex_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flex.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flex.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flex, detaching);
    		}
    	};
    }

    // (29:8) {#each buttonColors as color}
    function create_each_block_1$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[2],
    				color: /*color*/ ctx[5],
    				disabled: true,
    				$$slots: { default: [create_default_slot_2$c] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (20:4) {#each buttonTypes as variant}
    function create_each_block$2(ctx) {
    	let t;
    	let each1_anchor;
    	let current;
    	let each_value_2 = /*buttonColors*/ ctx[1];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value_1 = /*buttonColors*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*buttonTypes, buttonColors*/ 3) {
    				each_value_2 = /*buttonColors*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*buttonTypes, buttonColors*/ 3) {
    				each_value_1 = /*buttonColors*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each1_anchor);
    		}
    	};
    }

    // (40:4) <Button variant="outline" link="https://google.com">
    function create_default_slot_1$d(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Link Button");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (19:0) <Grid cols="1fr 1fr 1fr 1fr">
    function create_default_slot$j(ctx) {
    	let t;
    	let button;
    	let current;
    	let each_value = /*buttonTypes*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	button = new Button({
    			props: {
    				variant: "outline",
    				link: "https://google.com",
    				$$slots: { default: [create_default_slot_1$d] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*buttonColors, buttonTypes*/ 3) {
    				each_value = /*buttonTypes*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    function create_fragment$t(ctx) {
    	let h1;
    	let t1;
    	let grid;
    	let t2;
    	let markdown;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr 1fr 1fr",
    				$$slots: { default: [create_default_slot$j] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$r } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Button";
    			t1 = space();
    			create_component(grid.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(grid, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(grid, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$d($$self) {
    	const buttonTypes = ["normal", "outline", "fill"];
    	const buttonColors = ["default", "primary", "secondary", "danger"];
    	return [buttonTypes, buttonColors];
    }

    class Button_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$t, safe_not_equal, {});
    	}
    }

    var docs$q = "Used to display dynamic information and interaction in contrast with buttons\r\nthat remain largely static in position.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `clickable` | _boolean_ | | If true, `Chip` will have a ripple effect when clicked\r\n| `color` | _string_ | `\"default\"` | The theme color to use for the `Chip`. See the colors section of [theme](./theme.md) for details.\r\n| `label` | _string_ | | Text to display in the `Chip`\r\n\r\n## Slots\r\n- start\r\n- end\r\n\r\n## Events\r\n- click\r\n\r\n## Usage\r\n```svelte\r\n<Chip label color clickable on:click />\r\n```\r\n";

    /* site\src\component\chip.svelte generated by Svelte v3.55.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (21:4) {#each chipColors as color}
    function create_each_block_1(ctx) {
    	let chip;
    	let current;

    	chip = new Chip({
    			props: {
    				color: /*color*/ ctx[1],
    				clickable: true,
    				label: /*color*/ ctx[1]
    			}
    		});

    	return {
    		c() {
    			create_component(chip.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(chip, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(chip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(chip, detaching);
    		}
    	};
    }

    // (20:0) <Flex direction="row">
    function create_default_slot_2$b(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*chipColors*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*chipColors*/ 1) {
    				each_value_1 = /*chipColors*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (28:12) <Button compact slot="start">
    function create_default_slot_1$c(ctx) {
    	let icon;
    	let t;
    	let current;
    	icon = new Icon({ props: { name: "close" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (28:12) 
    function create_start_slot$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				compact: true,
    				slot: "start",
    				$$slots: { default: [create_default_slot_1$c] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (26:4) {#each chipColors as color}
    function create_each_block$1(ctx) {
    	let chip;
    	let current;

    	chip = new Chip({
    			props: {
    				color: /*color*/ ctx[1],
    				label: /*color*/ ctx[1],
    				$$slots: { start: [create_start_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(chip.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(chip, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const chip_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				chip_changes.$$scope = { dirty, ctx };
    			}

    			chip.$set(chip_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(chip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(chip, detaching);
    		}
    	};
    }

    // (25:0) <Flex direction="row">
    function create_default_slot$i(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*chipColors*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*chipColors*/ 1) {
    				each_value = /*chipColors*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment$s(ctx) {
    	let h1;
    	let t1;
    	let flex0;
    	let t2;
    	let flex1;
    	let t3;
    	let markdown;
    	let current;

    	flex0 = new Flex$1({
    			props: {
    				direction: "row",
    				$$slots: { default: [create_default_slot_2$b] },
    				$$scope: { ctx }
    			}
    		});

    	flex1 = new Flex$1({
    			props: {
    				direction: "row",
    				$$slots: { default: [create_default_slot$i] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$q } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Chip";
    			t1 = space();
    			create_component(flex0.$$.fragment);
    			t2 = space();
    			create_component(flex1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(flex0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(flex1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const flex0_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				flex0_changes.$$scope = { dirty, ctx };
    			}

    			flex0.$set(flex0_changes);
    			const flex1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				flex1_changes.$$scope = { dirty, ctx };
    			}

    			flex1.$set(flex1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flex0.$$.fragment, local);
    			transition_in(flex1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flex0.$$.fragment, local);
    			transition_out(flex1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(flex0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(flex1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$c($$self) {
    	const chipColors = ["default", "primary", "secondary", "danger"];
    	return [chipColors];
    }

    class Chip_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$s, safe_not_equal, {});
    	}
    }

    var docs$p = "Shows a circular load spinner.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `size` | _number_/_string_ | `100` | The size (width & height) of the spinner\r\n\r\n## Usage\r\n```svelte\r\n<CircleSpinner />\r\n<CircleSpinner size={250} />\r\n```\r\n";

    /* site\src\component\circle-spinner.svelte generated by Svelte v3.55.0 */

    function create_fragment$r(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let circlespinner0;
    	let t2;
    	let circlespinner1;
    	let t3;
    	let circlespinner2;
    	let t4;
    	let markdown;
    	let current;
    	circlespinner0 = new Circle_spinner$1({});
    	circlespinner1 = new Circle_spinner$1({ props: { size: 40 } });
    	circlespinner2 = new Circle_spinner$1({ props: { size: 250 } });
    	markdown = new Markdown_1({ props: { docs: docs$p } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "CircleSpinner";
    			t1 = space();
    			div = element("div");
    			create_component(circlespinner0.$$.fragment);
    			t2 = space();
    			create_component(circlespinner1.$$.fragment);
    			t3 = space();
    			create_component(circlespinner2.$$.fragment);
    			t4 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(circlespinner0, div, null);
    			append(div, t2);
    			mount_component(circlespinner1, div, null);
    			append(div, t3);
    			mount_component(circlespinner2, div, null);
    			insert(target, t4, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(circlespinner0.$$.fragment, local);
    			transition_in(circlespinner1.$$.fragment, local);
    			transition_in(circlespinner2.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(circlespinner0.$$.fragment, local);
    			transition_out(circlespinner1.$$.fragment, local);
    			transition_out(circlespinner2.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			destroy_component(circlespinner0);
    			destroy_component(circlespinner1);
    			destroy_component(circlespinner2);
    			if (detaching) detach(t4);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$b($$self) {
    	return [];
    }

    class Circle_spinner extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$r, safe_not_equal, {});
    	}
    }

    var docs$o = "Container for displaying dialog boxes with simple positioning controls.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `top` | _string_ | `\"0%\"` | Vetical position of the container\r\n| `left` | _string_ | `\"0%\"` | Horizontal position of the container\r\n| `originX` | _string_ | `\"0%\"` | The point within the container to use for horizontal positioning\r\n| `originY` | _string_ | `\"0%\"` | The point within the container to use for vertical positioning\r\n| `width` | _string_ | | Width of the container\r\n| `height` | _string_ | | Height of the container\r\n\r\n\r\n## Usage\r\n```svelte\r\n<DialogContent {top} {left} {originX} {originY} {width} {height}>\r\n    ...content\r\n</DialogContent>\r\n```\r\n";

    /* site\src\component\dialog-content.svelte generated by Svelte v3.55.0 */

    function create_default_slot$h(ctx) {
    	let t0;
    	let a;
    	let t1;

    	return {
    		c() {
    			t0 = text("Examples can be found in the built-in\n    ");
    			a = element("a");
    			t1 = text("dialog components");
    			attr(a, "href", href);
    			attr(a, "target", "_blank");
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, a, anchor);
    			append(a, t1);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(a);
    		}
    	};
    }

    function create_fragment$q(ctx) {
    	let h1;
    	let t1;
    	let text_1;
    	let t2;
    	let markdown;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot$h] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$o } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "DialogContent";
    			t1 = space();
    			create_component(text_1.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(text_1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    const href = "https://github.com/axel669/svelte-doric/tree/master/core/dialog";

    class Dialog_content extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$q, safe_not_equal, {});
    	}
    }

    var docs$n = "Automatically displays content as modal and includes a background for the modal\r\ncontent to visually separate it from the content it overlays. `dialog` is not a\r\ncomponent, but is instead an object that is used to display dialogs.\r\n\r\n## Options\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `persistent` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the dialog\r\n\r\n## Props\r\n\r\nThe dialog will automatically pass a `close` function prop to the component it\r\ndisplays, in addition to the props passed into the options.\r\n\r\n### Alert Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `message` | _string_ | | The message to show in the alert\r\n| `okText` | _string_ | `\"OK\"` | The text to show for the alert button\r\n| `title` | _string_ | `\"Alert\"` | The title to show in the alert. Passing null will hide the title\r\n\r\n### Confirm Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `cancelText` | _string_ | `\"Cancel\"` | The text to show for the cancel button\r\n| `message` | _string_ | | The message to show in the alert\r\n| `okText` | _string_ | `\"OK\"` | The text to show for the confirm button\r\n| `title` | _string_ | `\"Alert\"` | The title to show in the alert. Passing null will hide the title\r\n\r\n### Prompt Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `cancelText` | _string_ | `\"Cancel\"` | The text to show for the cancel button\r\n| `message` | _string_ | | The message to show in the alert\r\n| `okText` | _string_ | `\"OK\"` | The text to show for the confirm button\r\n| `placeholder` | _string_ | | Placeholder text for the text input\r\n| `title` | _string_ | `\"Alert\"` | The title to show in the alert. Passing null will hide the title\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    import { dialog, Alert, Confirm } from \"svelte-doric\"\r\n\r\n    const openDialog = async () => {\r\n        const value = await dialog.show(\r\n            Alert,\r\n            {\r\n                persistent: true,\r\n                ...alertOptions\r\n            }\r\n        )\r\n    }\r\n    const removeItem = async () => {\r\n        const value = await dialog.show(\r\n            Confirm,\r\n            {\r\n                persistent: true,\r\n                ...confirmOptions\r\n            }\r\n        )\r\n    }\r\n</script>\r\n```\r\n";

    /* site\src\component\dialog.svelte generated by Svelte v3.55.0 */

    function create_default_slot_2$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Show Alert");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (23:0) <Button variant="outline" on:click={showConfirm}>
    function create_default_slot_1$b(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Show Confirm");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (26:0) <Button variant="outline" on:click={showPrompt}>
    function create_default_slot$g(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Show Prompt");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$p(ctx) {
    	let h1;
    	let t1;
    	let button0;
    	let t2;
    	let button1;
    	let t3;
    	let button2;
    	let t4;
    	let markdown;
    	let current;

    	button0 = new Button({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot_2$a] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*showAlert*/ ctx[0]);

    	button1 = new Button({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot_1$b] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("click", /*showConfirm*/ ctx[1]);

    	button2 = new Button({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot$g] },
    				$$scope: { ctx }
    			}
    		});

    	button2.$on("click", /*showPrompt*/ ctx[2]);
    	markdown = new Markdown_1({ props: { docs: docs$n } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Dialog";
    			t1 = space();
    			create_component(button0.$$.fragment);
    			t2 = space();
    			create_component(button1.$$.fragment);
    			t3 = space();
    			create_component(button2.$$.fragment);
    			t4 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(button0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(button1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(button2, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(button0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(button1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(button2, detaching);
    			if (detaching) detach(t4);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$a($$self) {
    	const showAlert = () => dialog.show(Alert, { message: "This is an alert" });
    	const showConfirm = () => dialog.show(Confirm, { message: "This is a confirmation" });
    	const showPrompt = () => dialog.show(Prompt, { message: "This is a prompt" });
    	return [showAlert, showConfirm, showPrompt];
    }

    class Dialog extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$a, create_fragment$p, safe_not_equal, {});
    	}
    }

    var docs$m = "# Drawer\r\n\r\nShows a drawer that slides in and out from the left side of the screen.\r\n\r\n## Drawer Content\r\nThe content of a drawer should be a component that takes a `close` property,\r\nwhich is a function that can be called to close the drawer from code. Drawers\r\nwill automatically close if the user clicks outside the content area.\r\n\r\nEach property of the options argument will be passed into the provided\r\ncomponent as indivudual component props.\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    import { drawer } from \"svelte-doric\"\r\n\r\n    drawer.open(\r\n        DrawerContent,\r\n        {...options}\r\n    )\r\n</script>\r\n```\r\n";

    /* site\src\component\drawer.svelte generated by Svelte v3.55.0 */

    function create_fragment$o(ctx) {
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$m } });

    	return {
    		c() {
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$o, safe_not_equal, {});
    	}
    }

    var docs$l = "# Flex\r\n\r\nLayout that uses flexbox under the hood to layout items with a few common\r\nstyles applied.\r\n\r\n## Flex Alignment\r\nAll references to item alignment and justifying are from aligning items in flex\r\ncontainers, summarized (with helpful images) on [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Aligning_Items_in_a_Flex_Container)\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)\r\n| `center` | _boolean_ | `false` | If true, centers content in the container, overriding item and content align.\r\n| `contentAlign` | _string_ | | Flex line packing method on the cross axis. See Flex Alignment for details.\r\n| `direction` | _string_ | `\"column\"` | The direction the elements should be laid out. See Flex Alignment for details.\r\n| `gap` | _string_ | `\"4px\"` | Gap between elements. Include CSS units.\r\n| `itemAlign` | _string_ | | Item positioning on the cross-axis. See Flex Alignment for details.\r\n| `itemFill` | _boolean_ | `false` | If true, items will try to fill the available space.\r\n| `itemJustify` | _string_ | | Item positioning on the main-axis. See Flex Alignment for details.\r\n| `padding` | _string_ | `\"4px\"` | Padding between the container edge and the elements. Include CSS units.\r\n| `scrollable` | _boolean_ | `false` | Allows the flex container to scroll when content overflows.\r\n| `wrap` | _boolean_ | `false` | Allows items to wrap in the container.\r\n\r\n## Usage\r\n```svelte\r\n<Flex direction gap padding scrollable>\r\n    ...content\r\n</Flex>\r\n```\r\n";

    /* site\src\component\flex.svelte generated by Svelte v3.55.0 */

    function create_fragment$n(ctx) {
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$l } });

    	return {
    		c() {
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Flex extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$n, safe_not_equal, {});
    	}
    }

    var docs$k = "Element for displaying a footer at the bottom of a `Screen` or `Paper`\ncomponent.\n\n## Props\n| Name | Type | Default | Description |\n| --- | --- | --- | --- |\n| `bordered` | _boolean_ | `false` | Show a border around the footer.\n| `borderColor` | _string_ | | The color of the border, if shown. Use CSS colors.\n\n## Slots\n- left\n- right\n\n## Usage\n```svelte\n<Screen>\n    <Paper>\n        Content\n    </Paper>\n\n    <Footer slot=\"footer\">\n        <Button>Do Something</Button>\n    </Footer>\n</Screen>\n```\n";

    /* site\src\component\footer.svelte generated by Svelte v3.55.0 */

    function create_default_slot_2$9(ctx) {
    	let image;
    	let current;

    	image = new Image$1({
    			props: {
    				source: "https://wallpaperaccess.com/full/693300.png",
    				height: "200px"
    			}
    		});

    	return {
    		c() {
    			create_component(image.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(image, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(image.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(image.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(image, detaching);
    		}
    	};
    }

    // (23:8) <Button color="primary">
    function create_default_slot_1$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Do Something");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (22:4) <Footer slot="action">
    function create_default_slot$f(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_1$a] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (22:4) 
    function create_action_slot$3(ctx) {
    	let footer;
    	let current;

    	footer = new Footer$1({
    			props: {
    				slot: "action",
    				$$slots: { default: [create_default_slot$f] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(footer.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const footer_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				footer_changes.$$scope = { dirty, ctx };
    			}

    			footer.$set(footer_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(footer, detaching);
    		}
    	};
    }

    function create_fragment$m(ctx) {
    	let h1;
    	let t1;
    	let paper;
    	let t2;
    	let markdown;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				litemAlign: "center",
    				$$slots: {
    					action: [create_action_slot$3],
    					default: [create_default_slot_2$9]
    				},
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$k } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Footer";
    			t1 = space();
    			create_component(paper.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(paper, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const paper_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(paper, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Footer_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$m, safe_not_equal, {});
    	}
    }

    var docs$j = "# Functions\r\nFunctions that can be imported alongside any of the components in the library.\r\n\r\n## vars\r\n\r\nFunction for managing CSS variables on html elements.\r\nFor use with Svelte `use:`.\r\n\r\nTakes an object with variable names as the object keys and the information to create\r\nthe css values as the object values. Values that are non-arrays are passed in as\r\nis. Values that are `null` or `undefined` are not added (or removed) from the\r\nnodes' variables. Values that are arrays will be joined, and if the first value\r\nin the array is `null` or `undefined` it is skipped. This allows much simpler\r\npassing of variables with measurements that will not always be rendered but can be\r\ntracked in objects very simply.\r\n\r\n### Usage\r\n```svelte\r\n<script>\r\n    export let height = 100\r\n    $: cssVars = {\r\n        width: \"200px\",\r\n        height: [height, \"px\"],\r\n        opacity: 0.5,\r\n        // Won't be added\r\n        \"bg-color\": null,\r\n        \"offset-x\": [null, \"%\"]\r\n    }\r\n</script>\r\n\r\n<div use:vars={cssVars} />\r\n```\r\n\r\n## css\r\n\r\nTemplate literal tag for rendering css directly without svelte automatically\r\nscoping it (mainly used for themes).\r\n\r\n### Usage\r\n\r\n```svelte\r\n<script>\r\n    import { css } from \"svlete-doric\"\r\n\r\n    const theme = css`\r\n        body {\r\n            --font: Orbitron;\r\n            --background: #030303;\r\n            --background-layer: #04080C;\r\n            --layer-border-width: 1px;\r\n            --layer-border-color: #00EEEE;\r\n            --title-bar-background: #00EEEE;\r\n        }\r\n    `\r\n</script>\r\n\r\n{@html theme}\r\n\r\n```\r\n";

    /* site\src\component\functions.svelte generated by Svelte v3.55.0 */

    function create_fragment$l(ctx) {
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$j } });

    	return {
    		c() {
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Functions extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$l, safe_not_equal, {});
    	}
    }

    var docs$i = "Layout that uses grid under the hood to layout items with a few common\r\nstyles applied.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)\r\n| `autoCol` | _string_ | | Shorthand for `grid-auto-columns`\r\n| `autoRow` | _string_ | | Shorthand for `grid-auto-rows`\r\n| `cols` | _string_ | | Shorthand for `grid-template-columns`\r\n| `direction` | _string_ | `\"row\"` | Shorthand for `grid-auto-flow`\r\n| `rows` | _string_ | | Shorthand for `grid-template-rows`\r\n| `scrollable` | _boolean_ | `false` | Allow the grid to scroll when content overflows\r\n\r\n## Usage\r\n```svelte\r\n<Grid direction cols autoRows scrollable>\r\n    ...actions\r\n</Grid>\r\n```\r\n";

    /* site\src\component\grid.svelte generated by Svelte v3.55.0 */

    function add_css$2(target) {
    	append_styles(target, "svelte-8ho9oe", "grid-item.svelte-8ho9oe{display:block;padding:2px;border:1px solid var(--text-normal)}grid-item.svelte-8ho9oe::after{content:\"Grid Item\"}");
    }

    // (22:4) <Grid>
    function create_default_slot_1$9(ctx) {
    	let grid_item;

    	return {
    		c() {
    			grid_item = element("grid-item");
    			set_custom_element_data(grid_item, "class", "svelte-8ho9oe");
    		},
    		m(target, anchor) {
    			insert(target, grid_item, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(grid_item);
    		}
    	};
    }

    // (21:0) <Grid cols="1fr 1fr">
    function create_default_slot$e(ctx) {
    	let grid;
    	let t0;
    	let grid_item0;
    	let t1;
    	let grid_item1;
    	let t2;
    	let grid_item2;
    	let current;

    	grid = new Grid({
    			props: {
    				$$slots: { default: [create_default_slot_1$9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(grid.$$.fragment);
    			t0 = space();
    			grid_item0 = element("grid-item");
    			t1 = space();
    			grid_item1 = element("grid-item");
    			t2 = space();
    			grid_item2 = element("grid-item");
    			set_custom_element_data(grid_item0, "class", "svelte-8ho9oe");
    			set_custom_element_data(grid_item1, "class", "svelte-8ho9oe");
    			set_custom_element_data(grid_item2, "class", "svelte-8ho9oe");
    		},
    		m(target, anchor) {
    			mount_component(grid, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, grid_item0, anchor);
    			insert(target, t1, anchor);
    			insert(target, grid_item1, anchor);
    			insert(target, t2, anchor);
    			insert(target, grid_item2, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(grid, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(grid_item0);
    			if (detaching) detach(t1);
    			if (detaching) detach(grid_item1);
    			if (detaching) detach(t2);
    			if (detaching) detach(grid_item2);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let h1;
    	let t1;
    	let grid;
    	let t2;
    	let markdown;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr",
    				$$slots: { default: [create_default_slot$e] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$i } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Grid";
    			t1 = space();
    			create_component(grid.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(grid, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(grid, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Grid_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$k, safe_not_equal, {}, add_css$2);
    	}
    }

    var docs$h = "Shows a hexagonal load spinner.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `size` | _number_/_string_ | `100` | The size (width & height) of the spinner\r\n\r\n## Usage\r\n```svelte\r\n<HexagonSpinner />\r\n<HexagonSpinner size={250} />\r\n```\r\n";

    /* site\src\component\hexagon-spinner.svelte generated by Svelte v3.55.0 */

    function create_fragment$j(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let hexagonspinner0;
    	let t2;
    	let hexagonspinner1;
    	let t3;
    	let hexagonspinner2;
    	let t4;
    	let markdown;
    	let current;
    	hexagonspinner0 = new Hexagon_spinner$1({});
    	hexagonspinner1 = new Hexagon_spinner$1({ props: { size: 40 } });
    	hexagonspinner2 = new Hexagon_spinner$1({ props: { size: 250 } });
    	markdown = new Markdown_1({ props: { docs: docs$h } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "HexagonSpinner";
    			t1 = space();
    			div = element("div");
    			create_component(hexagonspinner0.$$.fragment);
    			t2 = space();
    			create_component(hexagonspinner1.$$.fragment);
    			t3 = space();
    			create_component(hexagonspinner2.$$.fragment);
    			t4 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(hexagonspinner0, div, null);
    			append(div, t2);
    			mount_component(hexagonspinner1, div, null);
    			append(div, t3);
    			mount_component(hexagonspinner2, div, null);
    			insert(target, t4, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(hexagonspinner0.$$.fragment, local);
    			transition_in(hexagonspinner1.$$.fragment, local);
    			transition_in(hexagonspinner2.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(hexagonspinner0.$$.fragment, local);
    			transition_out(hexagonspinner1.$$.fragment, local);
    			transition_out(hexagonspinner2.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			destroy_component(hexagonspinner0);
    			destroy_component(hexagonspinner1);
    			destroy_component(hexagonspinner2);
    			if (detaching) detach(t4);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Hexagon_spinner extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$j, safe_not_equal, {});
    	}
    }

    var docs$g = "Displays an icon from the Free Font Awesome icons.\r\n> [Font Awesome Icons](https://fontawesome.com/search?m=free)\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `name` | _string_ | | Name of the icon. See link above for icon names. Free version supports solid and brand icons, use with `\"type:icon\"`, solid is assumed if the `type:` is omitted\r\n| `size` | _string_ | | Size of the icons, uses CSS font sizes\r\n\r\n## Usage\r\n```svelte\r\n<Icon name size />\r\n```\r\n";

    /* site\src\component\icon.svelte generated by Svelte v3.55.0 */

    function create_default_slot$d(ctx) {
    	let icon0;
    	let t0;
    	let icon1;
    	let t1;
    	let icon2;
    	let t2;
    	let icon3;
    	let current;
    	icon0 = new Icon({ props: { name: "house" } });
    	icon1 = new Icon({ props: { name: "brands:github" } });
    	icon2 = new Icon({ props: { name: "calendar" } });
    	icon3 = new Icon({ props: { name: "hamburger" } });

    	return {
    		c() {
    			create_component(icon0.$$.fragment);
    			t0 = space();
    			create_component(icon1.$$.fragment);
    			t1 = space();
    			create_component(icon2.$$.fragment);
    			t2 = space();
    			create_component(icon3.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(icon1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(icon2, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(icon3, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			transition_in(icon2.$$.fragment, local);
    			transition_in(icon3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			transition_out(icon2.$$.fragment, local);
    			transition_out(icon3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(icon1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(icon2, detaching);
    			if (detaching) detach(t2);
    			destroy_component(icon3, detaching);
    		}
    	};
    }

    function create_fragment$i(ctx) {
    	let h1;
    	let t1;
    	let text_1;
    	let t2;
    	let markdown;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot$d] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$g } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Icon";
    			t1 = space();
    			create_component(text_1.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(text_1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Icon_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$i, safe_not_equal, {});
    	}
    }

    var docs$f = "Component for showing images within defined areas using fit functions.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `alt` | _string_ | | Image alt text\r\n| `height` | _string_ | | Height of the image. Include CSS units\r\n| `fit` | _string_ | `\"contain\"` | Image fit algorithm to use. See [CSS object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) supported values\r\n| `float` | _string_ | | Image float position. Image will not float if not defined\r\n| `soruce` | _string_ | | The image source. Anything supported by the `img` tag is allowed\r\n| `width` | _string_ | | Width of the image. Include CSS units\r\n\r\n## Usage\r\n```svelte\r\n<Image alt=\"\" fit=\"cover\" source={url} />\r\n```\r\n";

    /* site\src\component\image.svelte generated by Svelte v3.55.0 */

    function create_default_slot$c(ctx) {
    	let image0;
    	let t;
    	let span;
    	let image1;
    	let current;

    	image0 = new Image$1({
    			props: {
    				source: "https://wallpaperaccess.com/full/693300.png",
    				height: "200px"
    			}
    		});

    	image1 = new Image$1({
    			props: {
    				source: "https://wallpaperaccess.com/full/693300.png",
    				height: "200px",
    				width: "200px"
    			}
    		});

    	return {
    		c() {
    			create_component(image0.$$.fragment);
    			t = space();
    			span = element("span");
    			create_component(image1.$$.fragment);
    			set_style(span, "border", "1px solid var(--primary)");
    			set_style(span, "padding", "2px");
    		},
    		m(target, anchor) {
    			mount_component(image0, target, anchor);
    			insert(target, t, anchor);
    			insert(target, span, anchor);
    			mount_component(image1, span, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(image0.$$.fragment, local);
    			transition_in(image1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(image0.$$.fragment, local);
    			transition_out(image1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(image0, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(span);
    			destroy_component(image1);
    		}
    	};
    }

    function create_fragment$h(ctx) {
    	let h1;
    	let t1;
    	let paper;
    	let t2;
    	let markdown;
    	let current;

    	paper = new Paper({
    			props: {
    				litemAlign: "start",
    				flat: true,
    				$$slots: { default: [create_default_slot$c] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$f } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Image";
    			t1 = space();
    			create_component(paper.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(paper, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const paper_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(paper, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Image_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$h, safe_not_equal, {});
    	}
    }

    var docs$e = "Component for displaying lists of items that can optionally have interactions.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `clickable` | _boolean_ | | If true, items will be clickable and fire an `on:click` event with the item clicked as the detail property of the event\r\n| `cols` | _array_ | | Not used by the default list, but allows column information to passed into components for table-like behavior on custom components\r\n| `data` | _array_ | | The data to display in the list\r\n| `flat` | _boolean_ | `false` | If true, list will not have a border\r\n| `itemID` | _function_ | `(item) => item` | An optional function to use as the id in the svelte `#each`\r\n| `title` | _string_ | | The title to put into the header of the list\r\n| `square` | _boolean_ | `false` | If true, removes the rounded corners on the lsit\r\n| |\r\n| `body` | `Component` | | Custom component to render the body of the list\r\n| `footer` | `Component` | | Custom component to render the footer of the list\r\n| `header` | `Component` | | Custom component to render the header of the list\r\n| |\r\n| `page` | _number_ | | If paginated, what the current page is. Default list components will control the page without external management needed\r\n| `pageSize` | _number_ | | If defined, list will be paginated with pages of the size specified\r\n\r\n### Props passed to Header component\r\n- cols\r\n- data\r\n- title\r\n\r\n### Props passed to Body component\r\n- data\r\n- cols\r\n- clickable\r\n- page\r\n- pageSize\r\n- itemID\r\n\r\n### Props passed to Footer component\r\n- data\r\n- bind:page\r\n- pageSize\r\n\r\n## Usage\r\n```svelte\r\n<List\r\n    data={tableData}\r\n    title=\"Regular List\"\r\n    clickable\r\n    on:click={console.log}\r\n/>\r\n\r\n<List\r\n    data={tableData}\r\n    title=\"Paginated List\"\r\n    clickable\r\n    on:click={console.log}\r\n    pageSize={7}\r\n/>\r\n```\r\n";

    /* site\src\component\list.svelte generated by Svelte v3.55.0 */

    function create_fragment$g(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let list0;
    	let t2;
    	let list1;
    	let t3;
    	let markdown;
    	let current;

    	list0 = new List$1({
    			props: {
    				data: /*tableData*/ ctx[0],
    				title: "Regular List",
    				clickable: true
    			}
    		});

    	list0.$on("click", console.log);

    	list1 = new List$1({
    			props: {
    				data: /*tableData*/ ctx[0],
    				title: "Paginated List",
    				clickable: true,
    				pageSize: 7
    			}
    		});

    	list1.$on("click", console.log);
    	markdown = new Markdown_1({ props: { docs: docs$e } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "List";
    			t1 = space();
    			div = element("div");
    			create_component(list0.$$.fragment);
    			t2 = space();
    			create_component(list1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    			set_style(div, "height", "240px");
    			set_style(div, "overflow", "hidden");
    			set_style(div, "display", "grid");
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(list0, div, null);
    			insert(target, t2, anchor);
    			mount_component(list1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(list0.$$.fragment, local);
    			transition_in(list1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list0.$$.fragment, local);
    			transition_out(list1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			destroy_component(list0);
    			if (detaching) detach(t2);
    			destroy_component(list1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$9($$self) {
    	const tableData = Array.from({ length: 50 }, (_, i) => ({
    		name: `Item ${i + 1}`,
    		label: `Item ${i + 1}`,
    		value: i,
    		icon: i % 2 === 0 ? "sun" : "moon",
    		code: i ** 2 % 100,
    		long: ("a*").repeat(i)
    	}));

    	return [tableData];
    }

    class List_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$g, safe_not_equal, {});
    	}
    }

    var docs$d = "# Modal\r\n\r\nBase component to display modal content on screen.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `clear` | _boolean_ | | If true, the modal will be transparent\r\n| `open` | _boolean_ | | Controls if the modal is displayed or not\r\n| `persistent` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the modal\r\n\r\n## Events\r\n- close\r\n\r\n## Usage\r\n```svelte\r\n<Modal clear bind:open on:close persistent>\r\n    Modal Content\r\n</Modal>\r\n```\r\n";

    /* site\src\component\modal.svelte generated by Svelte v3.55.0 */

    function create_fragment$f(ctx) {
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$d } });

    	return {
    		c() {
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$f, safe_not_equal, {});
    	}
    }

    var docs$c = "Container component for displaying and grouping elements with some style.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `borderColor` | _string_ | | Overrides the border color of a `Paper` with the `card` prop set to true\r\n| `card` | _boolean_ | | If true, the paper will have a border to appear like a card element\r\n| `flat` | _boolean_ | | If true, removes the box shadow\r\n| `layout` | _Component_ | `Flex` | A layout component that wll determine how content is laid out in the `Paper`\r\n| `square` | _boolean_ | | If true, removes the border radius\r\n\r\n> To pass props into the layout component, use the prop name with \"l\" in front\r\n> (ex: lscrollable, lcols, ldirection, etc.)\r\n\r\n## Slots\r\n- title\r\n- action\r\n\r\n## Usage\r\n```svelte\r\n<Paper card flat square lscrollable>\r\n    <div>\r\n        Content\r\n    </div>\r\n\r\n    <Button slot=\"action\">\r\n        Do Something\r\n    </Button>\r\n</Paper>\r\n\r\n<Paper center layout={Grid}>\r\n    <Titlebar slot=\"title\">\r\n        Title\r\n    </Titlebar>\r\n\r\n    ...grid items\r\n</Paper>\r\n```\r\n";

    /* site\src\component\paper.svelte generated by Svelte v3.55.0 */

    function create_default_slot_4$7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (19:4) <Text>
    function create_default_slot_3$7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some more content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (15:0) <Paper>
    function create_default_slot_2$8(ctx) {
    	let text0;
    	let t;
    	let text1;
    	let current;

    	text0 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_4$7] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_3$7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text0.$$.fragment);
    			t = space();
    			create_component(text1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(text1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text0, detaching);
    			if (detaching) detach(t);
    			destroy_component(text1, detaching);
    		}
    	};
    }

    // (23:0) <Paper card>
    function create_default_slot_1$8(ctx) {
    	let image;
    	let current;

    	image = new Image$1({
    			props: {
    				source: "https://wallpaperaccess.com/full/693300.png",
    				height: "200px"
    			}
    		});

    	return {
    		c() {
    			create_component(image.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(image, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(image.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(image.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(image, detaching);
    		}
    	};
    }

    // (29:4) <Button slot="action" color="primary">
    function create_default_slot$b(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Action");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (29:4) 
    function create_action_slot$2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				slot: "action",
    				color: "primary",
    				$$slots: { default: [create_default_slot$b] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let h1;
    	let t1;
    	let paper0;
    	let t2;
    	let paper1;
    	let t3;
    	let markdown;
    	let current;

    	paper0 = new Paper({
    			props: {
    				$$slots: { default: [create_default_slot_2$8] },
    				$$scope: { ctx }
    			}
    		});

    	paper1 = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					action: [create_action_slot$2],
    					default: [create_default_slot_1$8]
    				},
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$c } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Paper";
    			t1 = space();
    			create_component(paper0.$$.fragment);
    			t2 = space();
    			create_component(paper1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(paper0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(paper1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const paper0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper0_changes.$$scope = { dirty, ctx };
    			}

    			paper0.$set(paper0_changes);
    			const paper1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper1_changes.$$scope = { dirty, ctx };
    			}

    			paper1.$set(paper1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper0.$$.fragment, local);
    			transition_in(paper1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper0.$$.fragment, local);
    			transition_out(paper1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(paper0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(paper1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Paper_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$e, safe_not_equal, {});
    	}
    }

    var docs$b = "Displays content over other items but isn't a full dialog window.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `anchor` | `object` | `{ left: \"0px\", top: \"100%\" }` | How to anchor the popover content to the content underneath\r\n| `size` | `object` | `{ width: \"100%\", height: \"auto\" }` | Size of the popover content to use. Percentages are based on the size of the content underneath\r\n\r\n## Bindings\r\n- show\r\n- hide\r\n\r\n## Usage\r\n```svelte\r\n<Popover let:show let:hide>\r\n    <Button on:click={show} variant=\"outline\">\r\n        Show Popover\r\n    </Button>\r\n\r\n    <Paper card slot=\"content\" on:click={open}>\r\n        <Text>\r\n            Popover Content\r\n        </Text>\r\n\r\n        <Button slot=\"action\" color=\"secondary\" on:click={hide}>\r\n            Close\r\n        </Button>\r\n    </Paper>\r\n</Popover>\r\n```\r\n";

    /* site\src\component\popover.svelte generated by Svelte v3.55.0 */

    function create_default_slot_9(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Show Popover");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (15:0) <Popover let:show let:hide>
    function create_default_slot_8$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", function () {
    		if (is_function(/*show*/ ctx[0])) /*show*/ ctx[0].apply(this, arguments);
    	});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (21:8) <Text>
    function create_default_slot_7$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Popover Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (20:4) <Paper card slot="content" on:click={open}>
    function create_default_slot_6$4(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_7$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (25:8) <Button slot="action" color="secondary" on:click={hide}>
    function create_default_slot_5$6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Close");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (25:8) 
    function create_action_slot_1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				slot: "action",
    				color: "secondary",
    				$$slots: { default: [create_default_slot_5$6] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", function () {
    		if (is_function(/*hide*/ ctx[1])) /*hide*/ ctx[1].apply(this, arguments);
    	});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (20:4) 
    function create_content_slot_1(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				slot: "content",
    				$$slots: {
    					action: [create_action_slot_1],
    					default: [create_default_slot_6$4]
    				},
    				$$scope: { ctx }
    			}
    		});

    	paper.$on("click", open);

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, hide*/ 6) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    // (32:4) <Button on:click={show} variant="outline">
    function create_default_slot_4$6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Show Popover (Clear Modal)");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (31:0) <Popover clear let:show let:hide>
    function create_default_slot_3$6(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot_4$6] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", function () {
    		if (is_function(/*show*/ ctx[0])) /*show*/ ctx[0].apply(this, arguments);
    	});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (37:8) <Text>
    function create_default_slot_2$7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Popover Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (36:4) <Paper card slot="content" on:click={open}>
    function create_default_slot_1$7(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_2$7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (41:8) <Button slot="action" color="secondary" on:click={hide}>
    function create_default_slot$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Close");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (41:8) 
    function create_action_slot$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				slot: "action",
    				color: "secondary",
    				$$slots: { default: [create_default_slot$a] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", function () {
    		if (is_function(/*hide*/ ctx[1])) /*hide*/ ctx[1].apply(this, arguments);
    	});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (36:4) 
    function create_content_slot(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				slot: "content",
    				$$slots: {
    					action: [create_action_slot$1],
    					default: [create_default_slot_1$7]
    				},
    				$$scope: { ctx }
    			}
    		});

    	paper.$on("click", open);

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, hide*/ 6) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let h1;
    	let t1;
    	let popover0;
    	let t2;
    	let popover1;
    	let t3;
    	let markdown;
    	let current;

    	popover0 = new Popover({
    			props: {
    				$$slots: {
    					content: [
    						create_content_slot_1,
    						({ show, hide }) => ({ 0: show, 1: hide }),
    						({ show, hide }) => (show ? 1 : 0) | (hide ? 2 : 0)
    					],
    					default: [
    						create_default_slot_8$1,
    						({ show, hide }) => ({ 0: show, 1: hide }),
    						({ show, hide }) => (show ? 1 : 0) | (hide ? 2 : 0)
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	popover1 = new Popover({
    			props: {
    				clear: true,
    				$$slots: {
    					content: [
    						create_content_slot,
    						({ show, hide }) => ({ 0: show, 1: hide }),
    						({ show, hide }) => (show ? 1 : 0) | (hide ? 2 : 0)
    					],
    					default: [
    						create_default_slot_3$6,
    						({ show, hide }) => ({ 0: show, 1: hide }),
    						({ show, hide }) => (show ? 1 : 0) | (hide ? 2 : 0)
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$b } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Popover";
    			t1 = space();
    			create_component(popover0.$$.fragment);
    			t2 = space();
    			create_component(popover1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(popover0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(popover1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const popover0_changes = {};

    			if (dirty & /*$$scope, hide, show*/ 7) {
    				popover0_changes.$$scope = { dirty, ctx };
    			}

    			popover0.$set(popover0_changes);
    			const popover1_changes = {};

    			if (dirty & /*$$scope, hide, show*/ 7) {
    				popover1_changes.$$scope = { dirty, ctx };
    			}

    			popover1.$set(popover1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(popover0.$$.fragment, local);
    			transition_in(popover1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(popover0.$$.fragment, local);
    			transition_out(popover1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(popover0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(popover1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Popover_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$d, safe_not_equal, {});
    	}
    }

    var docs$a = "# Portal\r\n\r\nSvelte action that moves children into a different area of the DOM tree so that\r\nelements can be logically grouped but not forced into the same area of the DOM.\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    import { portal } from \"svelte-doric\"\r\n</script>\r\n\r\n<tag use:portal />\r\n```\r\n";

    /* site\src\component\portal.svelte generated by Svelte v3.55.0 */

    function create_fragment$c(ctx) {
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$a } });

    	return {
    		c() {
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Portal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$c, safe_not_equal, {});
    	}
    }

    var docs$9 = "## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `options` | `Array` | | Options for the radio group. See below for option properties\r\n| `value` | any | | Value for the radio group\r\n| `checkedIcon` | `string` | `\"radio_button_checked\"` | Name of the Material Icon to display when the option is selected\r\n| `uncheckedIcon` | `string` | `\"radio_button_unchecked\"` | Name of the Material Icon to display when the option is not selected\r\n| `labelPosition` | `string` | `right` | Position of the label relative to the checkmark\r\n| `labelToggle` | `boolean` | `true` | If false, clicking the label of an option will not change the radio group's value\r\n| `cols` | `number` | `1` | Number of columns to use when displaying the options\r\n\r\n## Slots\r\n- label\r\n\r\n## Radio Option Properties\r\n```javascript\r\n{\r\n    // The theme color to use for the icon. See the colors section of theme for details\r\n    color: Optional(String),\r\n    label: String,\r\n    value: Object,\r\n    disabled: Boolean,\r\n}\r\n```\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    let value = \"first\"\r\n    const radioOptions = [\r\n        {label: \"First\", value: \"first\"},\r\n        {label: \"Second\", value: \"second\"},\r\n        {label: \"Numeric\", value: 0},\r\n    ]\r\n</script>\r\n\r\n<Radio bind:value options={radioOptions} cols={2} />\r\n<Radio bind:value options={radioOptions} cols={2} let:option>\r\n    <div slot=\"label\">\r\n        {option.label.toUpperCase()}\r\n    </div>\r\n</Radio>\r\n```\r\n";

    /* site\src\component\radio.svelte generated by Svelte v3.55.0 */

    function create_default_slot_2$6(ctx) {
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text("Radio Value: ");
    			t1 = text(/*value*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 1) set_data(t1, /*value*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (25:0) <Paper card>
    function create_default_slot_1$6(ctx) {
    	let radio;
    	let updating_value;
    	let current;

    	function radio_value_binding(value) {
    		/*radio_value_binding*/ ctx[2](value);
    	}

    	let radio_props = {
    		options: /*radioOptions*/ ctx[1],
    		cols: 2
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		radio_props.value = /*value*/ ctx[0];
    	}

    	radio = new Radio({ props: radio_props });
    	binding_callbacks.push(() => bind(radio, 'value', radio_value_binding, /*value*/ ctx[0]));

    	return {
    		c() {
    			create_component(radio.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(radio, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const radio_changes = {};

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				radio_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			radio.$set(radio_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(radio.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(radio.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(radio, detaching);
    		}
    	};
    }

    // (31:8) 
    function create_label_slot(ctx) {
    	let div;
    	let t_value = /*option*/ ctx[4].label.toUpperCase() + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "slot", "label");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*option*/ 16 && t_value !== (t_value = /*option*/ ctx[4].label.toUpperCase() + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (29:0) <Paper card>
    function create_default_slot$9(ctx) {
    	let radio;
    	let updating_value;
    	let current;

    	function radio_value_binding_1(value) {
    		/*radio_value_binding_1*/ ctx[3](value);
    	}

    	let radio_props = {
    		options: /*radioOptions*/ ctx[1],
    		cols: 2,
    		$$slots: {
    			label: [
    				create_label_slot,
    				({ option }) => ({ 4: option }),
    				({ option }) => option ? 16 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		radio_props.value = /*value*/ ctx[0];
    	}

    	radio = new Radio({ props: radio_props });
    	binding_callbacks.push(() => bind(radio, 'value', radio_value_binding_1, /*value*/ ctx[0]));

    	return {
    		c() {
    			create_component(radio.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(radio, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const radio_changes = {};

    			if (dirty & /*$$scope, option*/ 48) {
    				radio_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				radio_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			radio.$set(radio_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(radio.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(radio.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(radio, detaching);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let h1;
    	let t1;
    	let text_1;
    	let t2;
    	let paper0;
    	let t3;
    	let paper1;
    	let t4;
    	let markdown;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_2$6] },
    				$$scope: { ctx }
    			}
    		});

    	paper0 = new Paper({
    			props: {
    				card: true,
    				$$slots: { default: [create_default_slot_1$6] },
    				$$scope: { ctx }
    			}
    		});

    	paper1 = new Paper({
    			props: {
    				card: true,
    				$$slots: { default: [create_default_slot$9] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$9 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Radio";
    			t1 = space();
    			create_component(text_1.$$.fragment);
    			t2 = space();
    			create_component(paper0.$$.fragment);
    			t3 = space();
    			create_component(paper1.$$.fragment);
    			t4 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(text_1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(paper0, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(paper1, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope, value*/ 33) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const paper0_changes = {};

    			if (dirty & /*$$scope, value*/ 33) {
    				paper0_changes.$$scope = { dirty, ctx };
    			}

    			paper0.$set(paper0_changes);
    			const paper1_changes = {};

    			if (dirty & /*$$scope, value*/ 33) {
    				paper1_changes.$$scope = { dirty, ctx };
    			}

    			paper1.$set(paper1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(paper0.$$.fragment, local);
    			transition_in(paper1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(paper0.$$.fragment, local);
    			transition_out(paper1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(paper0, detaching);
    			if (detaching) detach(t3);
    			destroy_component(paper1, detaching);
    			if (detaching) detach(t4);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let value = "first";

    	const radioOptions = [
    		{ label: "First", value: "first" },
    		{ label: "Second", value: "second" },
    		{ label: "Numeric", value: 0 }
    	];

    	function radio_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function radio_value_binding_1(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	return [value, radioOptions, radio_value_binding, radio_value_binding_1];
    }

    class Radio_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$b, safe_not_equal, {});
    	}
    }

    var docs$8 = "# Ripple\r\n\r\nAdds a ripple effect to an element.\r\n\r\n## Props\r\nThis component takes no props.\r\n\r\n## Usage\r\nThe element that should have the `Ripple` effect must be `position: relative`\r\nor `position: absolute` in CSS.\r\n\r\n```svelte\r\n<style>\r\n    container-element {\r\n        position: relative;\r\n    }\r\n</style>\r\n\r\n<container-element>\r\n    <Ripple />\r\n</container-element>\r\n```\r\n";

    /* site\src\component\ripple.svelte generated by Svelte v3.55.0 */

    function create_fragment$a(ctx) {
    	let markdown;
    	let current;
    	markdown = new Markdown_1({ props: { docs: docs$8 } });

    	return {
    		c() {
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Ripple extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$a, safe_not_equal, {});
    	}
    }

    var docs$7 = "Element for displaying screens within an application that allows for consistent\r\nlayout and interaction across platforms (web, mobile, cordova, etc).\r\n\r\n> `Screen` is inteded to be used as the top level for all screens in an\r\n> application (because the components aren't standalone).\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `full` | _boolean_ | `false` | Has all parts of the screen use the full width of the page. Overrides other full options.\r\n| `fullContent` | _boolean_ | `false` | Set the content area to be the full width of the page.\r\n| `fullFooter` | _boolean_ | `false` | Set the footer to be the full width of the page.\r\n| `fullTitle` | _boolean_ | `false` | Set the title to be the full width of the page.\r\n| `width` | _string_ | `\"min(720px, 100%)\"` | Sets the width of any section that isn't a full-width section. Include CSS units.\r\n\r\n## Functions\r\n\r\nThese functions are available when using `bind:this` on a screen.\r\n\r\n### .openStack(Component, props)\r\nAdds a component using `Screen` over the current `Screen` in a stack-like view.\r\nStacked components will default to being 8px smaller on the top, left, and right\r\nthan the parent `Screen`.\r\n\r\n### .close(value)\r\nRemoves the current component from the view stack and returns the given value\r\nto the parent `Screen`.\r\n\r\n### .closeAll(value)\r\nRemoves all components but the top component from the view stack and passes the\r\ngiven value to the topmost `Screen`\r\n\r\n## Slots\r\n- title\r\n- footer\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    let scr = null\r\n\r\n    const viewItem = async (item) => {\r\n        console.log(\r\n            await scr.openStack(ItemScreen, { item })\r\n        )\r\n    }\r\n</script>\r\n\r\n<Screen bind:this={scr}>\r\n    <Appbar slot=\"title\">\r\n        Title\r\n    </Appbar>\r\n\r\n    <Paper>\r\n    </Paper>\r\n\r\n    <Footer slot=\"footer\">\r\n    </Footer>\r\n</Screen>\r\n```\r\n";

    /* site\src\component\screen.svelte generated by Svelte v3.55.0 */

    function create_default_slot$8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Open Subscreen");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let h1;
    	let t1;
    	let button;
    	let t2;
    	let markdown;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$8] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*click_handler*/ ctx[1]);
    	markdown = new Markdown_1({ props: { docs: docs$7 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Screen";
    			t1 = space();
    			create_component(button.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(button, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(button, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $screen;
    	component_subscribe($$self, screen$1, $$value => $$invalidate(0, $screen = $$value));
    	const click_handler = () => $screen.openStack(Subscreen);
    	return [$screen, click_handler];
    }

    class Screen extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, {});
    	}
    }

    var docs$6 = "Complete replacement to the html select element using what I hope will be a\r\nbetter way to handle the interaction without losing fucntionality.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `class` | _string_ | | Additional CSS classes to apply to the component\r\n| `disabled` | _boolean_ | `false` | If true, disables interaction with the `Select`\r\n| `label` | _string_ | | Label for the `Select`\r\n| `options` | _Array[object]_ | | An array of items to show as the options for the `Select`. Items must have a `label` and `value` property for the default display\r\n| `value` | any | | The value of the selected item in the options. If no item matching the given value is found, a fallback is displayed\r\n| `variant` | _string_ | | `Select` style variation. See `Button` variants\r\n| `let:info` | | | Used by the named slot `options` to customize the items in the open `Select`. Will be an object of `{currentValue, options, select}`, where `select` is a function to change the current value\r\n| `let:selected` | | | Used by the named slot `selected` to customize the content of the `Select`\r\n\r\n## Named Slots\r\n- selected\r\n- options\r\n\r\n## Child Tags\r\n| Tag Name | Description |\r\n| --- | --- |\r\n| `select-label` | Provides some default padding and alignment for the labels of items.\r\n\r\n## Usage\r\nThe named slot `selected` is used to customize the content of the `Select`\r\noutside of the options.\r\nThe named slot `options` is used to customize the look of the items in the\r\n`Select` list.\r\n\r\n> If no item matching the value provided is found, the select will throw an\r\n> error\r\n\r\n```svelte\r\n<Select {disabled} />\r\n<Select {info} {error} {label} {options} bind:value />\r\n<Select {class} {label} {options} {origin} {variant} bind:value />\r\n\r\n<Select let:info>\r\n    <OptionList {info} slot=\"options\" />\r\n</Select>\r\n<Select let:selectedItem>\r\n    <div slot=\"selected\">\r\n        {selectedItem.label ?? \"Please Select\"}\r\n    </div>\r\n</Select>\r\n```\r\n";

    /* site\src\component\select.svelte generated by Svelte v3.55.0 */

    function create_default_slot$7(ctx) {
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text("Select Value: ");
    			t1 = text(/*value*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 1) set_data(t1, /*value*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let h1;
    	let t1;
    	let text_1;
    	let t2;
    	let select0;
    	let updating_value;
    	let t3;
    	let select1;
    	let t4;
    	let select2;
    	let t5;
    	let markdown;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot$7] },
    				$$scope: { ctx }
    			}
    		});

    	function select0_value_binding(value) {
    		/*select0_value_binding*/ ctx[2](value);
    	}

    	let select0_props = {
    		options: /*options*/ ctx[1],
    		label: "Demo"
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		select0_props.value = /*value*/ ctx[0];
    	}

    	select0 = new Select({ props: select0_props });
    	binding_callbacks.push(() => bind(select0, 'value', select0_value_binding, /*value*/ ctx[0]));

    	select1 = new Select({
    			props: {
    				options: /*options*/ ctx[1],
    				label: "Searchable",
    				searchable: true
    			}
    		});

    	select2 = new Select({ props: { options: /*options*/ ctx[1] } });
    	markdown = new Markdown_1({ props: { docs: docs$6 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Select";
    			t1 = space();
    			create_component(text_1.$$.fragment);
    			t2 = space();
    			create_component(select0.$$.fragment);
    			t3 = space();
    			create_component(select1.$$.fragment);
    			t4 = space();
    			create_component(select2.$$.fragment);
    			t5 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(text_1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(select0, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(select1, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(select2, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope, value*/ 9) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const select0_changes = {};

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				select0_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			select0.$set(select0_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(select0.$$.fragment, local);
    			transition_in(select1.$$.fragment, local);
    			transition_in(select2.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(select0.$$.fragment, local);
    			transition_out(select1.$$.fragment, local);
    			transition_out(select2.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(select0, detaching);
    			if (detaching) detach(t3);
    			destroy_component(select1, detaching);
    			if (detaching) detach(t4);
    			destroy_component(select2, detaching);
    			if (detaching) detach(t5);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let value = 1;
    	const options = Array.from({ length: 50 }, (_, i) => ({ label: `Option #${i}`, value: i }));

    	function select0_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	return [value, options, select0_value_binding];
    }

    class Select_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$8, safe_not_equal, {});
    	}
    }

    var docs$5 = "Component for showing data tables.\r\n\r\n## Props\r\nThe table is actually just a List with custom elements defined so it takes the\r\nsame props, but the `cols` prop actually does something (documented below).\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    const tableData = Array.from(\r\n        { length: 50 },\r\n        (_, i) => ({\r\n            name: `Item ${i + 1}`,\r\n            text: `Item ${i + 1}`,\r\n            value: i,\r\n            icon: (i % 2) === 0 ? \"sun\" : \"moon\",\r\n            code: i ** 2 % 100,\r\n            long: \"a*\".repeat(i)\r\n        })\r\n    )\r\n    const tableCols = [\r\n        { value: \"name\", label: \"Name\" },\r\n        { value: \"code\", label: \"Item Code\" },\r\n        { value: \"long\", label: \"Long Text\", size: \"3fr\" },\r\n    ]\r\n</script>\r\n\r\n<Table data={tableData} />\r\n<Table\r\n    data={tableData}\r\n    pageSize={8}\r\n    cols={tableCols}\r\n/>\r\n```\r\n";

    /* site\src\component\table.svelte generated by Svelte v3.55.0 */

    function create_fragment$7(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let table0;
    	let t2;
    	let table1;
    	let t3;
    	let markdown;
    	let current;
    	table0 = new Table$1({ props: { data: /*tableData*/ ctx[0] } });

    	table1 = new Table$1({
    			props: {
    				data: /*tableData*/ ctx[0],
    				pageSize: 8,
    				cols: /*tableCols*/ ctx[1]
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$5 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Table";
    			t1 = space();
    			div = element("div");
    			create_component(table0.$$.fragment);
    			t2 = space();
    			create_component(table1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    			set_style(div, "height", "240px");
    			set_style(div, "overflow", "hidden");
    			set_style(div, "display", "grid");
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(table0, div, null);
    			insert(target, t2, anchor);
    			mount_component(table1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(table0.$$.fragment, local);
    			transition_in(table1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(table0.$$.fragment, local);
    			transition_out(table1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(div);
    			destroy_component(table0);
    			if (detaching) detach(t2);
    			destroy_component(table1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$5($$self) {
    	const tableData = Array.from({ length: 50 }, (_, i) => ({
    		name: `Item ${i + 1}`,
    		label: `Item ${i + 1}`,
    		value: i,
    		icon: i % 2 === 0 ? "sun" : "moon",
    		code: i ** 2 % 100,
    		long: ("a*").repeat(i)
    	}));

    	const tableCols = [
    		{ value: "name", label: "Name" },
    		{ value: "code", label: "Item Code" },
    		{
    			value: "long",
    			label: "Long Text",
    			size: "3fr"
    		}
    	];

    	return [tableData, tableCols];
    }

    class Table_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, {});
    	}
    }

    var docs$4 = "Component for creating tabs that can be used to switch between options or views.\r\nThe `Tabs` component only renders tabs and binds the currently selected tab,\r\nwhile the `TabPanel` actually renders content based on the current tab value.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)\r\n| `fillSelected` | _boolean_ | | If true, the selected tab will be filled with the primary color instead of just the border\r\n| `tabGroup` | _any_ | | The value for the currently selected tab\r\n| `options` | _Array_ | List of tabs to display. See below for tab option details\r\n| `vertical` | _boolean_ | `false` | If true, display tabs vertically\r\n\r\n## TabPabel Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `area` | _boolean_ | | If true, the panel will have the `grid-area: panel` css property set\r\n| `tabGroup` | _any_ | | The selected tab value\r\n| `value` | _any_ | | The value representing the tab option\r\n\r\n### Tab Option Properties\r\n```javascript\r\n{\r\n    label: String,\r\n    value: Object,\r\n    icon: Optional(String)\r\n}\r\n```\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    let tab = \"first\"\r\n    const tabOptions = [\r\n        {label: \"First\", value: \"first\"},\r\n        {label: \"Second\", value: \"second\"},\r\n        {label: \"Numeric\", value: 0, icon: \"flask\"},\r\n    ]\r\n</script>\r\n\r\n<Tabs bind:tabGroup={tab} options={tabOptions} vertical />\r\n\r\n<TabPanel value=\"first\" tabGroup={tab} area>\r\n    First Tab Content\r\n</TabPanel>\r\n<TabPanel value=\"Second\" tabGroup={tab} area>\r\n    Second Tab Content\r\n</TabPanel>\r\n<TabPanel value={0} tabGroup={tab} area>\r\n    Number Tab Content\r\n</TabPanel>\r\n```\r\n";

    /* site\src\component\tabs.svelte generated by Svelte v3.55.0 */

    function create_default_slot_7$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("First Tab Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (29:4) <TabPanel value="second" tabGroup={tab}>
    function create_default_slot_6$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Second Tab Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (32:4) <TabPanel value={0} tabGroup={tab}>
    function create_default_slot_5$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Number Tab Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (23:0) <Paper card lautoRow="auto" lcols="1fr" layout={Grid}>
    function create_default_slot_4$5(ctx) {
    	let tabs;
    	let updating_tabGroup;
    	let t0;
    	let tabpanel0;
    	let t1;
    	let tabpanel1;
    	let t2;
    	let tabpanel2;
    	let current;

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[2](value);
    	}

    	let tabs_props = { options: /*tabOptions*/ ctx[1] };

    	if (/*tab*/ ctx[0] !== void 0) {
    		tabs_props.tabGroup = /*tab*/ ctx[0];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, 'tabGroup', tabs_tabGroup_binding, /*tab*/ ctx[0]));

    	tabpanel0 = new Tab_panel({
    			props: {
    				value: "first",
    				tabGroup: /*tab*/ ctx[0],
    				$$slots: { default: [create_default_slot_7$2] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel1 = new Tab_panel({
    			props: {
    				value: "second",
    				tabGroup: /*tab*/ ctx[0],
    				$$slots: { default: [create_default_slot_6$3] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel2 = new Tab_panel({
    			props: {
    				value: 0,
    				tabGroup: /*tab*/ ctx[0],
    				$$slots: { default: [create_default_slot_5$5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    			t2 = space();
    			create_component(tabpanel2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabs, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(tabpanel2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*tab*/ 1) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    			const tabpanel0_changes = {};
    			if (dirty & /*tab*/ 1) tabpanel0_changes.tabGroup = /*tab*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};
    			if (dirty & /*tab*/ 1) tabpanel1_changes.tabGroup = /*tab*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};
    			if (dirty & /*tab*/ 1) tabpanel2_changes.tabGroup = /*tab*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tabs, detaching);
    			if (detaching) detach(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(tabpanel1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(tabpanel2, detaching);
    		}
    	};
    }

    // (39:4) <TabPanel value="first" tabGroup={tab}>
    function create_default_slot_3$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("First Tab Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (42:4) <TabPanel value="second" tabGroup={tab}>
    function create_default_slot_2$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Second Tab Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (45:4) <TabPanel value={0} tabGroup={tab}>
    function create_default_slot_1$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Number Tab Content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (36:0) <Paper card lcols="1fr 3fr" layout={Grid}>
    function create_default_slot$6(ctx) {
    	let tabs;
    	let updating_tabGroup;
    	let t0;
    	let tabpanel0;
    	let t1;
    	let tabpanel1;
    	let t2;
    	let tabpanel2;
    	let current;

    	function tabs_tabGroup_binding_1(value) {
    		/*tabs_tabGroup_binding_1*/ ctx[3](value);
    	}

    	let tabs_props = {
    		options: /*tabOptions*/ ctx[1],
    		vertical: true
    	};

    	if (/*tab*/ ctx[0] !== void 0) {
    		tabs_props.tabGroup = /*tab*/ ctx[0];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, 'tabGroup', tabs_tabGroup_binding_1, /*tab*/ ctx[0]));

    	tabpanel0 = new Tab_panel({
    			props: {
    				value: "first",
    				tabGroup: /*tab*/ ctx[0],
    				$$slots: { default: [create_default_slot_3$5] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel1 = new Tab_panel({
    			props: {
    				value: "second",
    				tabGroup: /*tab*/ ctx[0],
    				$$slots: { default: [create_default_slot_2$5] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel2 = new Tab_panel({
    			props: {
    				value: 0,
    				tabGroup: /*tab*/ ctx[0],
    				$$slots: { default: [create_default_slot_1$5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    			t2 = space();
    			create_component(tabpanel2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabs, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(tabpanel2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*tab*/ 1) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tab*/ ctx[0];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    			const tabpanel0_changes = {};
    			if (dirty & /*tab*/ 1) tabpanel0_changes.tabGroup = /*tab*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};
    			if (dirty & /*tab*/ 1) tabpanel1_changes.tabGroup = /*tab*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};
    			if (dirty & /*tab*/ 1) tabpanel2_changes.tabGroup = /*tab*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tabs, detaching);
    			if (detaching) detach(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(tabpanel1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(tabpanel2, detaching);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let h1;
    	let t1;
    	let paper0;
    	let t2;
    	let paper1;
    	let t3;
    	let markdown;
    	let current;

    	paper0 = new Paper({
    			props: {
    				card: true,
    				lautoRow: "auto",
    				lcols: "1fr",
    				layout: Grid,
    				$$slots: { default: [create_default_slot_4$5] },
    				$$scope: { ctx }
    			}
    		});

    	paper1 = new Paper({
    			props: {
    				card: true,
    				lcols: "1fr 3fr",
    				layout: Grid,
    				$$slots: { default: [create_default_slot$6] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$4 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Tabs";
    			t1 = space();
    			create_component(paper0.$$.fragment);
    			t2 = space();
    			create_component(paper1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(paper0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(paper1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const paper0_changes = {};

    			if (dirty & /*$$scope, tab*/ 17) {
    				paper0_changes.$$scope = { dirty, ctx };
    			}

    			paper0.$set(paper0_changes);
    			const paper1_changes = {};

    			if (dirty & /*$$scope, tab*/ 17) {
    				paper1_changes.$$scope = { dirty, ctx };
    			}

    			paper1.$set(paper1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper0.$$.fragment, local);
    			transition_in(paper1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper0.$$.fragment, local);
    			transition_out(paper1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(paper0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(paper1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let tab = "first";

    	const tabOptions = [
    		{ label: "First", value: "first" },
    		{ label: "Second", value: "second" },
    		{
    			label: "Numeric",
    			value: 0,
    			icon: "flask"
    		}
    	];

    	function tabs_tabGroup_binding(value) {
    		tab = value;
    		$$invalidate(0, tab);
    	}

    	function tabs_tabGroup_binding_1(value) {
    		tab = value;
    		$$invalidate(0, tab);
    	}

    	return [tab, tabOptions, tabs_tabGroup_binding, tabs_tabGroup_binding_1];
    }

    class Tabs_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, {});
    	}
    }

    var docs$3 = "Fancier looking single line text input.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)\r\n| `disabled` | _boolean_ | `false` | If true, disables interaction with the `TextInput`\r\n| `error` | _string_ | | Changes the color of the input border/label to red and overrides the extra text at the bottom\r\n| `extra` | _string_ | | Extra text to show at the bottom of the `TextInput`\r\n| `flat` | _boolean_ | | Changes the text input border style to the regular material style\r\n| `label` | _string_ | | Label for the `TextInput`\r\n| `type` | _string_ | `\"text\"` | Input type. Primarily used to affect the keyboard display on mobile devices. Only tested with `\"text\"`, `\"password\"`, `\"number\"`\r\n| `value` | _any_ | | Value to use with Svelte `:bind`. See binding values on `<input>` tags for more detail\r\n| `validation` | _function_ | `null` | A validation function that runs when the value is updated. See next section for API details. Post-transform value is always used for validation\r\n| `transform` | _function_ | `null` | A transform function that runs when the value is updated and on first render. Can return any value type because it does not assign back to `value`\r\n| `tvalue` | _any_ | | The prop that the transform function outputs to (so that weird conditions with value dont happen). Setting this prop has no affect on the input, use `bind:tvalue` to recieve transformed values\r\n\r\n## Validation\r\nThe validate function should return a string containing an error message if the\r\nvalue of the input is invalid, or `null` to indicate the value passes\r\nvalidation. When validation fails, `tvalue` will be set to `undefined` even if\r\nthe transform function compeltes succesfully.\r\n\r\n## Slots\r\n- start\r\n- end\r\n\r\n## Events\r\n- blur\r\n- focus\r\n\r\n## Usage\r\n```svelte\r\n<script>\r\n    let value = \"\"\r\n</script>\r\n\r\n<TextInput bind:value {class} {label} {info} {class} {error} {type} disabled />\r\n<TextInput bind:value flat />\r\n\r\n<TextInput>\r\n    <Text adorn slot=\"start\">\r\n        <Icon name=\"search\" />\r\n    </Text>\r\n</TextInput>\r\n<TextInput label=\"Currency\">\r\n    <Text adorn slot=\"start\">$</Text>\r\n</TextInput>\r\n\r\n<TextInput label=\"Search Params\" error=\"Who even knows\">\r\n    <Button adorn slot=\"end\">Find</Button>\r\n</TextInput>\r\n\r\n<TextInput\r\n    {validate}\r\n    {transform}\r\n    col=\"span 2\"\r\n    label=\"Transform + Validate\"\r\n    extra=\"List of words, comma separated, outputs array\"\r\n    bind:tvalue={transformed}\r\n/>\r\n```\r\n";

    /* site\src\component\text-input.svelte generated by Svelte v3.55.0 */

    function create_default_slot_6$2(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "search" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (32:8) 
    function create_start_slot_3(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				slot: "start",
    				adorn: true,
    				$$slots: { default: [create_default_slot_6$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (40:8) <Text slot="start" adorn>
    function create_default_slot_5$4(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "search" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (40:8) 
    function create_start_slot_2(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				slot: "start",
    				adorn: true,
    				$$slots: { default: [create_default_slot_5$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (48:8) <Button adorn slot="start">
    function create_default_slot_4$4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Find");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (48:8) 
    function create_start_slot_1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "start",
    				$$slots: { default: [create_default_slot_4$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (52:8) <Button adorn slot="end">
    function create_default_slot_3$4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Find");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (52:8) 
    function create_end_slot_1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "end",
    				$$slots: { default: [create_default_slot_3$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (56:8) <Button adorn slot="start">
    function create_default_slot_2$4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Find");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (56:8) 
    function create_start_slot(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "start",
    				$$slots: { default: [create_default_slot_2$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (60:8) <Button adorn slot="end">
    function create_default_slot_1$4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Find");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (60:8) 
    function create_end_slot(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "end",
    				$$slots: { default: [create_default_slot_1$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (30:0) <Grid cols="1fr 1fr" padding="0px" autoRow="max-content">
    function create_default_slot$5(ctx) {
    	let textinput0;
    	let updating_value;
    	let t0;
    	let textinput1;
    	let updating_value_1;
    	let t1;
    	let textinput2;
    	let updating_value_2;
    	let t2;
    	let textinput3;
    	let updating_value_3;
    	let t3;
    	let textinput4;
    	let updating_value_4;
    	let t4;
    	let textinput5;
    	let updating_value_5;
    	let t5;
    	let textinput6;
    	let t6;
    	let textinput7;
    	let t7;
    	let textinput8;
    	let t8;
    	let textinput9;
    	let t9;
    	let textinput10;
    	let updating_tvalue;
    	let t10;
    	let pre;
    	let t11_value = JSON.stringify(/*transformed*/ ctx[0]) + "";
    	let t11;
    	let current;

    	function textinput0_value_binding(value) {
    		/*textinput0_value_binding*/ ctx[4](value);
    	}

    	let textinput0_props = {
    		label: "Testing?",
    		col: "span 2",
    		$$slots: { start: [create_start_slot_3] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput0_props.value = /*value*/ ctx[1];
    	}

    	textinput0 = new Text_input$1({ props: textinput0_props });
    	binding_callbacks.push(() => bind(textinput0, 'value', textinput0_value_binding, /*value*/ ctx[1]));

    	function textinput1_value_binding(value) {
    		/*textinput1_value_binding*/ ctx[5](value);
    	}

    	let textinput1_props = {};

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput1_props.value = /*value*/ ctx[1];
    	}

    	textinput1 = new Text_input$1({ props: textinput1_props });
    	binding_callbacks.push(() => bind(textinput1, 'value', textinput1_value_binding, /*value*/ ctx[1]));

    	function textinput2_value_binding(value) {
    		/*textinput2_value_binding*/ ctx[6](value);
    	}

    	let textinput2_props = { extra: "wat" };

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput2_props.value = /*value*/ ctx[1];
    	}

    	textinput2 = new Text_input$1({ props: textinput2_props });
    	binding_callbacks.push(() => bind(textinput2, 'value', textinput2_value_binding, /*value*/ ctx[1]));

    	function textinput3_value_binding(value) {
    		/*textinput3_value_binding*/ ctx[7](value);
    	}

    	let textinput3_props = {
    		label: "Testing?",
    		flat: true,
    		col: "span 2",
    		$$slots: { start: [create_start_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput3_props.value = /*value*/ ctx[1];
    	}

    	textinput3 = new Text_input$1({ props: textinput3_props });
    	binding_callbacks.push(() => bind(textinput3, 'value', textinput3_value_binding, /*value*/ ctx[1]));

    	function textinput4_value_binding(value) {
    		/*textinput4_value_binding*/ ctx[8](value);
    	}

    	let textinput4_props = { flat: true };

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput4_props.value = /*value*/ ctx[1];
    	}

    	textinput4 = new Text_input$1({ props: textinput4_props });
    	binding_callbacks.push(() => bind(textinput4, 'value', textinput4_value_binding, /*value*/ ctx[1]));

    	function textinput5_value_binding(value) {
    		/*textinput5_value_binding*/ ctx[9](value);
    	}

    	let textinput5_props = { extra: "wat", flat: true };

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput5_props.value = /*value*/ ctx[1];
    	}

    	textinput5 = new Text_input$1({ props: textinput5_props });
    	binding_callbacks.push(() => bind(textinput5, 'value', textinput5_value_binding, /*value*/ ctx[1]));

    	textinput6 = new Text_input$1({
    			props: {
    				label: "Search",
    				$$slots: { start: [create_start_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	textinput7 = new Text_input$1({
    			props: {
    				label: "Search Params",
    				$$slots: { end: [create_end_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	textinput8 = new Text_input$1({
    			props: {
    				label: "Search",
    				error: "Not Found",
    				$$slots: { start: [create_start_slot] },
    				$$scope: { ctx }
    			}
    		});

    	textinput9 = new Text_input$1({
    			props: {
    				label: "Search Params",
    				error: "Who even knows",
    				$$slots: { end: [create_end_slot] },
    				$$scope: { ctx }
    			}
    		});

    	function textinput10_tvalue_binding(value) {
    		/*textinput10_tvalue_binding*/ ctx[10](value);
    	}

    	let textinput10_props = {
    		validate: /*validate*/ ctx[3],
    		transform: /*transform*/ ctx[2],
    		col: "span 2",
    		label: "Transform + Validate",
    		extra: "List of words, comma separated, outputs array"
    	};

    	if (/*transformed*/ ctx[0] !== void 0) {
    		textinput10_props.tvalue = /*transformed*/ ctx[0];
    	}

    	textinput10 = new Text_input$1({ props: textinput10_props });
    	binding_callbacks.push(() => bind(textinput10, 'tvalue', textinput10_tvalue_binding, /*transformed*/ ctx[0]));

    	return {
    		c() {
    			create_component(textinput0.$$.fragment);
    			t0 = space();
    			create_component(textinput1.$$.fragment);
    			t1 = space();
    			create_component(textinput2.$$.fragment);
    			t2 = space();
    			create_component(textinput3.$$.fragment);
    			t3 = space();
    			create_component(textinput4.$$.fragment);
    			t4 = space();
    			create_component(textinput5.$$.fragment);
    			t5 = space();
    			create_component(textinput6.$$.fragment);
    			t6 = space();
    			create_component(textinput7.$$.fragment);
    			t7 = space();
    			create_component(textinput8.$$.fragment);
    			t8 = space();
    			create_component(textinput9.$$.fragment);
    			t9 = space();
    			create_component(textinput10.$$.fragment);
    			t10 = space();
    			pre = element("pre");
    			t11 = text(t11_value);
    		},
    		m(target, anchor) {
    			mount_component(textinput0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(textinput1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(textinput2, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(textinput3, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(textinput4, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(textinput5, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(textinput6, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(textinput7, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(textinput8, target, anchor);
    			insert(target, t8, anchor);
    			mount_component(textinput9, target, anchor);
    			insert(target, t9, anchor);
    			mount_component(textinput10, target, anchor);
    			insert(target, t10, anchor);
    			insert(target, pre, anchor);
    			append(pre, t11);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const textinput0_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				textinput0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 2) {
    				updating_value = true;
    				textinput0_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};

    			if (!updating_value_1 && dirty & /*value*/ 2) {
    				updating_value_1 = true;
    				textinput1_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};

    			if (!updating_value_2 && dirty & /*value*/ 2) {
    				updating_value_2 = true;
    				textinput2_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				textinput3_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty & /*value*/ 2) {
    				updating_value_3 = true;
    				textinput3_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};

    			if (!updating_value_4 && dirty & /*value*/ 2) {
    				updating_value_4 = true;
    				textinput4_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			textinput4.$set(textinput4_changes);
    			const textinput5_changes = {};

    			if (!updating_value_5 && dirty & /*value*/ 2) {
    				updating_value_5 = true;
    				textinput5_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value_5 = false);
    			}

    			textinput5.$set(textinput5_changes);
    			const textinput6_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				textinput6_changes.$$scope = { dirty, ctx };
    			}

    			textinput6.$set(textinput6_changes);
    			const textinput7_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				textinput7_changes.$$scope = { dirty, ctx };
    			}

    			textinput7.$set(textinput7_changes);
    			const textinput8_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				textinput8_changes.$$scope = { dirty, ctx };
    			}

    			textinput8.$set(textinput8_changes);
    			const textinput9_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				textinput9_changes.$$scope = { dirty, ctx };
    			}

    			textinput9.$set(textinput9_changes);
    			const textinput10_changes = {};

    			if (!updating_tvalue && dirty & /*transformed*/ 1) {
    				updating_tvalue = true;
    				textinput10_changes.tvalue = /*transformed*/ ctx[0];
    				add_flush_callback(() => updating_tvalue = false);
    			}

    			textinput10.$set(textinput10_changes);
    			if ((!current || dirty & /*transformed*/ 1) && t11_value !== (t11_value = JSON.stringify(/*transformed*/ ctx[0]) + "")) set_data(t11, t11_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			transition_in(textinput3.$$.fragment, local);
    			transition_in(textinput4.$$.fragment, local);
    			transition_in(textinput5.$$.fragment, local);
    			transition_in(textinput6.$$.fragment, local);
    			transition_in(textinput7.$$.fragment, local);
    			transition_in(textinput8.$$.fragment, local);
    			transition_in(textinput9.$$.fragment, local);
    			transition_in(textinput10.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			transition_out(textinput6.$$.fragment, local);
    			transition_out(textinput7.$$.fragment, local);
    			transition_out(textinput8.$$.fragment, local);
    			transition_out(textinput9.$$.fragment, local);
    			transition_out(textinput10.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(textinput0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(textinput1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(textinput2, detaching);
    			if (detaching) detach(t2);
    			destroy_component(textinput3, detaching);
    			if (detaching) detach(t3);
    			destroy_component(textinput4, detaching);
    			if (detaching) detach(t4);
    			destroy_component(textinput5, detaching);
    			if (detaching) detach(t5);
    			destroy_component(textinput6, detaching);
    			if (detaching) detach(t6);
    			destroy_component(textinput7, detaching);
    			if (detaching) detach(t7);
    			destroy_component(textinput8, detaching);
    			if (detaching) detach(t8);
    			destroy_component(textinput9, detaching);
    			if (detaching) detach(t9);
    			destroy_component(textinput10, detaching);
    			if (detaching) detach(t10);
    			if (detaching) detach(pre);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let h1;
    	let t1;
    	let grid;
    	let t2;
    	let markdown;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr",
    				padding: "0px",
    				autoRow: "max-content",
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$3 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "TextInput";
    			t1 = space();
    			create_component(grid.$$.fragment);
    			t2 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(grid, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, transformed, value*/ 2051) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(grid, detaching);
    			if (detaching) detach(t2);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let transformed = undefined;
    	const transform = text => text.split(",").map(t => t.trim());

    	const validate = value => {
    		if ((/^[a-z, ]*$/i).test(value) === false) {
    			return "only a-z allowed";
    		}

    		return null;
    	};

    	let value = "text";

    	function textinput0_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput1_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput2_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput3_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput4_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput5_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput10_tvalue_binding(value) {
    		transformed = value;
    		$$invalidate(0, transformed);
    	}

    	return [
    		transformed,
    		value,
    		transform,
    		validate,
    		textinput0_value_binding,
    		textinput1_value_binding,
    		textinput2_value_binding,
    		textinput3_value_binding,
    		textinput4_value_binding,
    		textinput5_value_binding,
    		textinput10_tvalue_binding
    	];
    }

    class Text_input extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, {});
    	}
    }

    var docs$2 = "Displays text with some predefined styles. Not required to show text, just a\r\nhandy way to use the shorthands defined in the library, and have text interact\r\nwith the layouts in a sane and predictable fashion.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)\r\n| `align` | _string_ | `\"left\"` | Text alignment for normal text boxes (non adorn text).\r\n| `block` | _boolean_ | `false` | If true, text will be displayed in a block element instead of an inline element.\r\n| `color` | _string_ | `\"default\"` | The coloration of the `Text`. Valid options are `\"default\"`, `\"primary\"`, `\"secondary\"`, and `\"danger\"`.\r\n| `subtitle` | _boolean_ | `false` | Displays the text smaller for use in secondary text in titles.\r\n| `textColor` | _string_ | | Set the color of the text using CSS for colors outside the standard ones.\r\n| `textSize` | _string_ | | Sets the text size. Include CSS units.\r\n\r\n## Usage\r\n\r\n```svelte\r\n<Text>Some text</Text>\r\n<Text color=\"primary\">Some text</Text>\r\n\r\n<div>\r\n    <Text>a line of text</Text>\r\n    <Text block>Block text</Text>\r\n    <Text>another line of text</Text>\r\n</div>\r\n```\r\n";

    /* site\src\component\text.svelte generated by Svelte v3.55.0 */

    function create_default_slot_8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Regular Text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (14:0) <Text color="primary">
    function create_default_slot_7$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Primary");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (15:0) <Text color="secondary">
    function create_default_slot_6$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Secondary");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (16:0) <Text color="danger">
    function create_default_slot_5$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Danger");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (17:0) <Text subtitle>
    function create_default_slot_4$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Subtitle");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (21:8) <Text>
    function create_default_slot_3$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("a line of text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (22:8) <Text block>
    function create_default_slot_2$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Block text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (23:8) <Text>
    function create_default_slot_1$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("another line of text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (19:0) <Paper>
    function create_default_slot$4(ctx) {
    	let div;
    	let text0;
    	let t0;
    	let text1;
    	let t1;
    	let text2;
    	let current;

    	text0 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_3$3] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				block: true,
    				$$slots: { default: [create_default_slot_2$3] },
    				$$scope: { ctx }
    			}
    		});

    	text2 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(text0.$$.fragment);
    			t0 = space();
    			create_component(text1.$$.fragment);
    			t1 = space();
    			create_component(text2.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(text0, div, null);
    			append(div, t0);
    			mount_component(text1, div, null);
    			append(div, t1);
    			mount_component(text2, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    			const text2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text2_changes.$$scope = { dirty, ctx };
    			}

    			text2.$set(text2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			transition_in(text2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			transition_out(text2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(text0);
    			destroy_component(text1);
    			destroy_component(text2);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let h1;
    	let t1;
    	let text0;
    	let t2;
    	let text1;
    	let t3;
    	let text2;
    	let t4;
    	let text3;
    	let t5;
    	let text4;
    	let t6;
    	let paper;
    	let t7;
    	let markdown;
    	let current;

    	text0 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_7$1] },
    				$$scope: { ctx }
    			}
    		});

    	text2 = new Text$1({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	text3 = new Text$1({
    			props: {
    				color: "danger",
    				$$slots: { default: [create_default_slot_5$3] },
    				$$scope: { ctx }
    			}
    		});

    	text4 = new Text$1({
    			props: {
    				subtitle: true,
    				$$slots: { default: [create_default_slot_4$3] },
    				$$scope: { ctx }
    			}
    		});

    	paper = new Paper({
    			props: {
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$2 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Text";
    			t1 = space();
    			create_component(text0.$$.fragment);
    			t2 = space();
    			create_component(text1.$$.fragment);
    			t3 = space();
    			create_component(text2.$$.fragment);
    			t4 = space();
    			create_component(text3.$$.fragment);
    			t5 = space();
    			create_component(text4.$$.fragment);
    			t6 = space();
    			create_component(paper.$$.fragment);
    			t7 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(text0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(text1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(text2, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(text3, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(text4, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(paper, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const text0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    			const text2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text2_changes.$$scope = { dirty, ctx };
    			}

    			text2.$set(text2_changes);
    			const text3_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text3_changes.$$scope = { dirty, ctx };
    			}

    			text3.$set(text3_changes);
    			const text4_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text4_changes.$$scope = { dirty, ctx };
    			}

    			text4.$set(text4_changes);
    			const paper_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			transition_in(text2.$$.fragment, local);
    			transition_in(text3.$$.fragment, local);
    			transition_in(text4.$$.fragment, local);
    			transition_in(paper.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			transition_out(text2.$$.fragment, local);
    			transition_out(text3.$$.fragment, local);
    			transition_out(text4.$$.fragment, local);
    			transition_out(paper.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(text0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(text1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(text2, detaching);
    			if (detaching) detach(t4);
    			destroy_component(text3, detaching);
    			if (detaching) detach(t5);
    			destroy_component(text4, detaching);
    			if (detaching) detach(t6);
    			destroy_component(paper, detaching);
    			if (detaching) detach(t7);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Text_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$4, safe_not_equal, {});
    	}
    }

    var docs$1 = "Component for making title bars at the top of elements on the page.\r\n\r\n## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `center` | _boolean_ | `false` | If `false` the `Titlebar` text will be left-aligned by default. If `true` the text will be centered.\r\n| `compact` | _boolean_ | | If true, `Titlebar` will be shorter and remove the background color.\r\n| `sticky` | _boolean_ | `false` | If `true` the `Titlebar` will use sticky positioning at the top.\r\n\r\n## Slots\r\n- menu\r\n- action\r\n- extension\r\n\r\n## Usage\r\n```svelte\r\n<Paper>\r\n    <Titlebar slot=\"title\">\r\n        Title\r\n    </Titlebar>\r\n</Paper>\r\n<Paper>\r\n    <Titlebar slot=\"title\">\r\n        Other Title\r\n\r\n        <Button adorn slot=\"menu\">\r\n            <Icon name=\"bars\" />\r\n        </Button>\r\n    </Titlebar>\r\n</Paper>\r\n```\r\n";

    /* site\src\component\titlebar.svelte generated by Svelte v3.55.0 */

    function create_default_slot_7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some kind of content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (17:0) <Paper card>
    function create_default_slot_6(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (18:4) <Titlebar slot="title">
    function create_default_slot_5$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some Title");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (21:8) 
    function create_extension_slot(ctx) {
    	let textinput;
    	let current;

    	textinput = new Text_input$1({
    			props: {
    				label: "Search",
    				adorn: true,
    				slot: "extension"
    			}
    		});

    	return {
    		c() {
    			create_component(textinput.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(textinput, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(textinput.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textinput.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(textinput, detaching);
    		}
    	};
    }

    // (18:4) 
    function create_title_slot_1(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Titlebar({
    			props: {
    				slot: "title",
    				$$slots: {
    					extension: [create_extension_slot],
    					default: [create_default_slot_5$2]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    		}
    	};
    }

    // (40:4) <Text>
    function create_default_slot_4$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some kind of content");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (28:0) <Paper card>
    function create_default_slot_3$2(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text$1({
    			props: {
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    		}
    	};
    }

    // (29:4) <Titlebar slot="title">
    function create_default_slot_2$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some Cooler Title");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (32:8) <Button adorn slot="menu">
    function create_default_slot_1$2(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "bars" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (32:8) 
    function create_menu_slot$1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "menu",
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (35:8) <Button adorn slot="action">
    function create_default_slot$3(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "copy" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (35:8) 
    function create_action_slot(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				adorn: true,
    				slot: "action",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (29:4) 
    function create_title_slot$1(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Titlebar({
    			props: {
    				slot: "title",
    				$$slots: {
    					action: [create_action_slot],
    					menu: [create_menu_slot$1],
    					default: [create_default_slot_2$2]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let h1;
    	let t1;
    	let paper0;
    	let t2;
    	let paper1;
    	let t3;
    	let markdown;
    	let current;

    	paper0 = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					title: [create_title_slot_1],
    					default: [create_default_slot_6]
    				},
    				$$scope: { ctx }
    			}
    		});

    	paper1 = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					title: [create_title_slot$1],
    					default: [create_default_slot_3$2]
    				},
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs: docs$1 } });

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Titlebar";
    			t1 = space();
    			create_component(paper0.$$.fragment);
    			t2 = space();
    			create_component(paper1.$$.fragment);
    			t3 = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(paper0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(paper1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const paper0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper0_changes.$$scope = { dirty, ctx };
    			}

    			paper0.$set(paper0_changes);
    			const paper1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				paper1_changes.$$scope = { dirty, ctx };
    			}

    			paper1.$set(paper1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper0.$$.fragment, local);
    			transition_in(paper1.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper0.$$.fragment, local);
    			transition_out(paper1.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			destroy_component(paper0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(paper1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    class Titlebar_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$3, safe_not_equal, {});
    	}
    }

    var docs = "Component for toggled controls (checkbox and regular toggle).\n\n## Props\n| Name | Type | Default | Description |\n| --- | --- | --- | --- |\n| `checkbox` | _string_ | `\"default\"` | If true, the on and off icons will be appropriate for a checkbox. Just a shortand for those settings really\n| `color` | _boolean_ | | The theme color to use for the `Toggle` checkmark. See the colors section of `Theme` for details\n| `disabled` | _string_ | | I'm tired of docs, everyone knows what this is\n| `label` | _string_ | | Optional. If given, will be the text displayed next to the toggle icon, otherwise it will use the child elements\n| `iconpos` | _string_ | `\"left\"` | Placement of the icon relative to the label text/elements\n| `on` | _string_ | | The toggle state\n| `onIcon` | _string_ | | Icon to show when the toggle is on.\n| `offIcon` | _string_ | | Icon to show when the toggle is off.\n\n## Usage\n```svelte\n<Toggle col=\"span 2\" label=\"Checkbox\" bind:on checkbox />\n<Toggle color=\"primary\" col=\"span 2\" label=\"Toggle\" bind:on />\n<Toggle color=\"secondary\" label=\"Checkbox\" bind:on iconpos=\"right\" checkbox />\n<Toggle color=\"danger\" label=\"Toggle\" bind:on iconpos=\"right\">\n    <img src=\"some cool image\" />\n</Toggle>\n```\n";

    /* site\src\component\toggle.svelte generated by Svelte v3.55.0 */

    function create_default_slot$2(ctx) {
    	let toggle0;
    	let updating_on;
    	let t0;
    	let toggle1;
    	let updating_on_1;
    	let t1;
    	let toggle2;
    	let updating_on_2;
    	let t2;
    	let toggle3;
    	let updating_on_3;
    	let t3;
    	let toggle4;
    	let updating_on_4;
    	let t4;
    	let toggle5;
    	let updating_on_5;
    	let t5;
    	let toggle6;
    	let updating_on_6;
    	let t6;
    	let toggle7;
    	let updating_on_7;
    	let current;

    	function toggle0_on_binding(value) {
    		/*toggle0_on_binding*/ ctx[1](value);
    	}

    	let toggle0_props = {
    		col: "span 2",
    		label: "Checkbox",
    		checkbox: true
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle0_props.on = /*on*/ ctx[0];
    	}

    	toggle0 = new Toggle({ props: toggle0_props });
    	binding_callbacks.push(() => bind(toggle0, 'on', toggle0_on_binding, /*on*/ ctx[0]));

    	function toggle1_on_binding(value) {
    		/*toggle1_on_binding*/ ctx[2](value);
    	}

    	let toggle1_props = {
    		color: "primary",
    		col: "span 2",
    		label: "Toggle"
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle1_props.on = /*on*/ ctx[0];
    	}

    	toggle1 = new Toggle({ props: toggle1_props });
    	binding_callbacks.push(() => bind(toggle1, 'on', toggle1_on_binding, /*on*/ ctx[0]));

    	function toggle2_on_binding(value) {
    		/*toggle2_on_binding*/ ctx[3](value);
    	}

    	let toggle2_props = {
    		color: "secondary",
    		label: "Checkbox",
    		iconpos: "right",
    		checkbox: true
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle2_props.on = /*on*/ ctx[0];
    	}

    	toggle2 = new Toggle({ props: toggle2_props });
    	binding_callbacks.push(() => bind(toggle2, 'on', toggle2_on_binding, /*on*/ ctx[0]));

    	function toggle3_on_binding(value) {
    		/*toggle3_on_binding*/ ctx[4](value);
    	}

    	let toggle3_props = {
    		color: "danger",
    		label: "Toggle",
    		iconpos: "right"
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle3_props.on = /*on*/ ctx[0];
    	}

    	toggle3 = new Toggle({ props: toggle3_props });
    	binding_callbacks.push(() => bind(toggle3, 'on', toggle3_on_binding, /*on*/ ctx[0]));

    	function toggle4_on_binding(value) {
    		/*toggle4_on_binding*/ ctx[5](value);
    	}

    	let toggle4_props = {
    		color: "danger",
    		disabled: true,
    		label: "Checkbox",
    		checkbox: true
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle4_props.on = /*on*/ ctx[0];
    	}

    	toggle4 = new Toggle({ props: toggle4_props });
    	binding_callbacks.push(() => bind(toggle4, 'on', toggle4_on_binding, /*on*/ ctx[0]));

    	function toggle5_on_binding(value) {
    		/*toggle5_on_binding*/ ctx[6](value);
    	}

    	let toggle5_props = {
    		color: "secondary",
    		disabled: true,
    		label: "Toggle"
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle5_props.on = /*on*/ ctx[0];
    	}

    	toggle5 = new Toggle({ props: toggle5_props });
    	binding_callbacks.push(() => bind(toggle5, 'on', toggle5_on_binding, /*on*/ ctx[0]));

    	function toggle6_on_binding(value) {
    		/*toggle6_on_binding*/ ctx[7](value);
    	}

    	let toggle6_props = {
    		color: "primary",
    		col: "span 2",
    		disabled: true,
    		label: "Checkbox",
    		iconpos: "right",
    		checkbox: true
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle6_props.on = /*on*/ ctx[0];
    	}

    	toggle6 = new Toggle({ props: toggle6_props });
    	binding_callbacks.push(() => bind(toggle6, 'on', toggle6_on_binding, /*on*/ ctx[0]));

    	function toggle7_on_binding(value) {
    		/*toggle7_on_binding*/ ctx[8](value);
    	}

    	let toggle7_props = {
    		col: "span 2",
    		disabled: true,
    		label: "Toggle",
    		iconpos: "right"
    	};

    	if (/*on*/ ctx[0] !== void 0) {
    		toggle7_props.on = /*on*/ ctx[0];
    	}

    	toggle7 = new Toggle({ props: toggle7_props });
    	binding_callbacks.push(() => bind(toggle7, 'on', toggle7_on_binding, /*on*/ ctx[0]));

    	return {
    		c() {
    			create_component(toggle0.$$.fragment);
    			t0 = space();
    			create_component(toggle1.$$.fragment);
    			t1 = space();
    			create_component(toggle2.$$.fragment);
    			t2 = space();
    			create_component(toggle3.$$.fragment);
    			t3 = space();
    			create_component(toggle4.$$.fragment);
    			t4 = space();
    			create_component(toggle5.$$.fragment);
    			t5 = space();
    			create_component(toggle6.$$.fragment);
    			t6 = space();
    			create_component(toggle7.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(toggle0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(toggle1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(toggle2, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(toggle3, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(toggle4, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(toggle5, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(toggle6, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(toggle7, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const toggle0_changes = {};

    			if (!updating_on && dirty & /*on*/ 1) {
    				updating_on = true;
    				toggle0_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on = false);
    			}

    			toggle0.$set(toggle0_changes);
    			const toggle1_changes = {};

    			if (!updating_on_1 && dirty & /*on*/ 1) {
    				updating_on_1 = true;
    				toggle1_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_1 = false);
    			}

    			toggle1.$set(toggle1_changes);
    			const toggle2_changes = {};

    			if (!updating_on_2 && dirty & /*on*/ 1) {
    				updating_on_2 = true;
    				toggle2_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_2 = false);
    			}

    			toggle2.$set(toggle2_changes);
    			const toggle3_changes = {};

    			if (!updating_on_3 && dirty & /*on*/ 1) {
    				updating_on_3 = true;
    				toggle3_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_3 = false);
    			}

    			toggle3.$set(toggle3_changes);
    			const toggle4_changes = {};

    			if (!updating_on_4 && dirty & /*on*/ 1) {
    				updating_on_4 = true;
    				toggle4_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_4 = false);
    			}

    			toggle4.$set(toggle4_changes);
    			const toggle5_changes = {};

    			if (!updating_on_5 && dirty & /*on*/ 1) {
    				updating_on_5 = true;
    				toggle5_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_5 = false);
    			}

    			toggle5.$set(toggle5_changes);
    			const toggle6_changes = {};

    			if (!updating_on_6 && dirty & /*on*/ 1) {
    				updating_on_6 = true;
    				toggle6_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_6 = false);
    			}

    			toggle6.$set(toggle6_changes);
    			const toggle7_changes = {};

    			if (!updating_on_7 && dirty & /*on*/ 1) {
    				updating_on_7 = true;
    				toggle7_changes.on = /*on*/ ctx[0];
    				add_flush_callback(() => updating_on_7 = false);
    			}

    			toggle7.$set(toggle7_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(toggle0.$$.fragment, local);
    			transition_in(toggle1.$$.fragment, local);
    			transition_in(toggle2.$$.fragment, local);
    			transition_in(toggle3.$$.fragment, local);
    			transition_in(toggle4.$$.fragment, local);
    			transition_in(toggle5.$$.fragment, local);
    			transition_in(toggle6.$$.fragment, local);
    			transition_in(toggle7.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(toggle0.$$.fragment, local);
    			transition_out(toggle1.$$.fragment, local);
    			transition_out(toggle2.$$.fragment, local);
    			transition_out(toggle3.$$.fragment, local);
    			transition_out(toggle4.$$.fragment, local);
    			transition_out(toggle5.$$.fragment, local);
    			transition_out(toggle6.$$.fragment, local);
    			transition_out(toggle7.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(toggle0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(toggle1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(toggle2, detaching);
    			if (detaching) detach(t2);
    			destroy_component(toggle3, detaching);
    			if (detaching) detach(t3);
    			destroy_component(toggle4, detaching);
    			if (detaching) detach(t4);
    			destroy_component(toggle5, detaching);
    			if (detaching) detach(t5);
    			destroy_component(toggle6, detaching);
    			if (detaching) detach(t6);
    			destroy_component(toggle7, detaching);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let grid;
    	let t;
    	let markdown;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new Markdown_1({ props: { docs } });

    	return {
    		c() {
    			create_component(grid.$$.fragment);
    			t = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(grid, target, anchor);
    			insert(target, t, anchor);
    			mount_component(markdown, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, on*/ 513) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			transition_in(markdown.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			transition_out(markdown.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(grid, detaching);
    			if (detaching) detach(t);
    			destroy_component(markdown, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let on = false;

    	function toggle0_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle1_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle2_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle3_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle4_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle5_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle6_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	function toggle7_on_binding(value) {
    		on = value;
    		$$invalidate(0, on);
    	}

    	return [
    		on,
    		toggle0_on_binding,
    		toggle1_on_binding,
    		toggle2_on_binding,
    		toggle3_on_binding,
    		toggle4_on_binding,
    		toggle5_on_binding,
    		toggle6_on_binding,
    		toggle7_on_binding
    	];
    }

    class Toggle_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    var component = /*#__PURE__*/Object.freeze({
        __proto__: null,
        actionArea: Action_area,
        adornment: Adornment,
        appStyle: App_style,
        appbar: Appbar,
        avatar: Avatar_1,
        badge: Badge_1,
        baseline: Baseline,
        button: Button_1,
        chip: Chip_1,
        circleSpinner: Circle_spinner,
        dialogContent: Dialog_content,
        dialog: Dialog,
        drawer: Drawer,
        flex: Flex,
        footer: Footer_1,
        functions: Functions,
        grid: Grid_1,
        hexagonSpinner: Hexagon_spinner,
        icon: Icon_1,
        image: Image_1,
        list: List_1,
        modal: Modal,
        paper: Paper_1,
        popover: Popover_1,
        portal: Portal,
        radio: Radio_1,
        ripple: Ripple,
        screen: Screen,
        select: Select_1,
        table: Table_1,
        tabs: Tabs_1,
        textInput: Text_input,
        text: Text_1,
        titlebar: Titlebar_1,
        toggle: Toggle_1
    });

    // const currentView = writable(
    //     localStorage.page
    //     ?? null
    // )
    const view = derived(
        [hash],
        ([current]) => component[current] ?? Home
    );
    const components = Object.keys(component);

    /* site\src\app\menu.svelte generated by Svelte v3.55.0 */

    function add_css$1(target) {
    	append_styles(target, "svelte-fu39of", "component-list.svelte-fu39of{position:relative;display:grid;overflow:auto;gap:2px;padding:2px;grid-template-columns:1fr;grid-auto-rows:max-content}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i].label;
    	child_ctx[11] = list[i].value;
    	return child_ctx;
    }

    // (70:4) <Titlebar>
    function create_default_slot_5$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Theme");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (75:4) <Titlebar>
    function create_default_slot_4$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Components");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (79:8) <Button link="">
    function create_default_slot_3$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Home");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (87:12) {:else}
    function create_else_block(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				link: `#${/*value*/ ctx[11]}`,
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (83:12) {#if value === $hash}
    function create_if_block(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				link: `#${/*value*/ ctx[11]}`,
    				variant: "fill",
    				color: "primary",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (88:16) <Button link={`#${value}`}>
    function create_default_slot_2$1(ctx) {
    	let t0_value = /*label*/ ctx[10] + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (84:16) <Button link={`#${value}`} variant="fill" color="primary">
    function create_default_slot_1$1(ctx) {
    	let t0_value = /*label*/ ctx[10] + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (82:8) {#each componentList as {label, value}}
    function create_each_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*value*/ ctx[11] === /*$hash*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (69:0) <Grid cols="1fr" rows="repeat(3, max-content) 3fr" fit>
    function create_default_slot$1(ctx) {
    	let titlebar0;
    	let t0;
    	let tabs;
    	let updating_tabGroup;
    	let t1;
    	let titlebar1;
    	let t2;
    	let component_list;
    	let button;
    	let t3;
    	let current;

    	titlebar0 = new Titlebar({
    			props: {
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[6](value);
    	}

    	let tabs_props = {
    		options: /*themes*/ ctx[3],
    		vertical: true,
    		fillSelected: true
    	};

    	if (/*$themeValue*/ ctx[1] !== void 0) {
    		tabs_props.tabGroup = /*$themeValue*/ ctx[1];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, 'tabGroup', tabs_tabGroup_binding, /*$themeValue*/ ctx[1]));

    	titlebar1 = new Titlebar({
    			props: {
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	button = new Button({
    			props: {
    				link: "",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*componentList*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(titlebar0.$$.fragment);
    			t0 = space();
    			create_component(tabs.$$.fragment);
    			t1 = space();
    			create_component(titlebar1.$$.fragment);
    			t2 = space();
    			component_list = element("component-list");
    			create_component(button.$$.fragment);
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(component_list, "class", "svelte-fu39of");
    		},
    		m(target, anchor) {
    			mount_component(titlebar0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(tabs, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(titlebar1, target, anchor);
    			insert(target, t2, anchor);
    			insert(target, component_list, anchor);
    			mount_component(button, component_list, null);
    			append(component_list, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(component_list, null);
    			}

    			/*component_list_binding*/ ctx[7](component_list);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar0_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				titlebar0_changes.$$scope = { dirty, ctx };
    			}

    			titlebar0.$set(titlebar0_changes);
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*$themeValue*/ 2) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*$themeValue*/ ctx[1];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    			const titlebar1_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				titlebar1_changes.$$scope = { dirty, ctx };
    			}

    			titlebar1.$set(titlebar1_changes);
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (dirty & /*componentList, $hash*/ 17) {
    				each_value = /*componentList*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(component_list, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar0.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			transition_in(titlebar1.$$.fragment, local);
    			transition_in(button.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar0.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			transition_out(titlebar1.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(tabs, detaching);
    			if (detaching) detach(t1);
    			destroy_component(titlebar1, detaching);
    			if (detaching) detach(t2);
    			if (detaching) detach(component_list);
    			destroy_component(button);
    			destroy_each(each_blocks, detaching);
    			/*component_list_binding*/ ctx[7](null);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div;
    	let t;
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr",
    				rows: "repeat(3, max-content) 3fr",
    				fit: true,
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			t = space();
    			create_component(grid.$$.fragment);
    			set_style(div, "width", "12.5vw");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t, anchor);
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const grid_changes = {};

    			if (dirty & /*$$scope, comps, $hash, $themeValue*/ 16391) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t);
    			destroy_component(grid, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $hash;
    	let $themeValue;
    	component_subscribe($$self, hash, $$value => $$invalidate(0, $hash = $$value));
    	component_subscribe($$self, themeValue, $$value => $$invalidate(1, $themeValue = $$value));
    	let { close } = $$props;

    	const themes = [
    		{ label: "Light", value: "light" },
    		{ label: "Dark", value: "dark" },
    		{ label: "Tron", value: "tron" }
    	];

    	const componentList = [
    		// { label: "Home", value: null },
    		...components.map(name => ({
    			value: name,
    			label: `${name.charAt(0).toUpperCase()}${name.slice(1)}`
    		}))
    	];

    	const themeChanged = onChange($themeValue);
    	const pageChanged = onChange($hash);
    	let comps = null;

    	onMount(() => {
    		const item = comps.querySelector(".primary");

    		if (item === null) {
    			return;
    		}

    		$$invalidate(2, comps.scrollTop = item.offsetTop, comps);
    	});

    	function tabs_tabGroup_binding(value) {
    		$themeValue = value;
    		themeValue.set($themeValue);
    	}

    	function component_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			comps = $$value;
    			$$invalidate(2, comps);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(5, close = $$props.close);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$themeValue, close*/ 34) {
    			if (themeChanged($themeValue) === true) {
    				close();
    			}
    		}

    		if ($$self.$$.dirty & /*$hash, close*/ 33) {
    			if (pageChanged($hash) === true) {
    				close();
    			}
    		}
    	};

    	return [
    		$hash,
    		$themeValue,
    		comps,
    		themes,
    		componentList,
    		close,
    		tabs_tabGroup_binding,
    		component_list_binding
    	];
    }

    class Menu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { close: 5 }, add_css$1);
    	}
    }

    /* site\src\app.svelte generated by Svelte v3.55.0 */

    function add_css(target) {
    	append_styles(target, "svelte-rf4zw6", "table{border:1px solid var(--primary);border-collapse:collapse;border-radius:4px}td, th{border:1px solid var(--primary);padding:4px}blockquote{margin-left:0px;padding-left:28px;border-left:2px solid var(--primary)}pre{overflow:auto;padding:4px}site-content.svelte-rf4zw6{display:flex;flex-direction:column;padding:8px;gap:4px;max-width:720px}@media screen and (min-width: 640px){site-content.svelte-rf4zw6{padding-left:5vw}}");
    }

    // (79:4) <Paper lscrollable square>
    function create_default_slot_5(ctx) {
    	let site_content;
    	let switch_instance;
    	let current;
    	var switch_value = /*$view*/ ctx[2];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    	}

    	return {
    		c() {
    			site_content = element("site-content");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			set_custom_element_data(site_content, "class", "svelte-rf4zw6");
    		},
    		m(target, anchor) {
    			insert(target, site_content, anchor);
    			if (switch_instance) mount_component(switch_instance, site_content, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*$view*/ ctx[2])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, site_content, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(site_content);
    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    }

    // (62:0) <Screen full bind:this={$screen}>
    function create_default_slot_4(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				lscrollable: true,
    				square: true,
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const paper_changes = {};

    			if (dirty & /*$$scope, $view*/ 36) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(paper, detaching);
    		}
    	};
    }

    // (63:4) <Appbar slot="title">
    function create_default_slot_3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Svelte Doric");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (67:12) <Button adorn on:click={openMenu}>
    function create_default_slot_2(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "hamburger" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (70:12) <Button              adorn              link="https://github.com/axel669/svelte-doric|_blank"              >
    function create_default_slot_1(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "brands:github" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (66:8) <Grid padding="0px" cols="1fr 1fr" slot="menu">
    function create_default_slot(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				adorn: true,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*openMenu*/ ctx[3]);

    	button1 = new Button({
    			props: {
    				adorn: true,
    				link: "https://github.com/axel669/svelte-doric|_blank",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t);
    			destroy_component(button1, detaching);
    		}
    	};
    }

    // (66:8) 
    function create_menu_slot(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				padding: "0px",
    				cols: "1fr 1fr",
    				slot: "menu",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(grid.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(grid, detaching);
    		}
    	};
    }

    // (63:4) 
    function create_title_slot(ctx) {
    	let appbar;
    	let current;

    	appbar = new Appbar$1({
    			props: {
    				slot: "title",
    				$$slots: {
    					menu: [create_menu_slot],
    					default: [create_default_slot_3]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(appbar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appbar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const appbar_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appbar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appbar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appbar, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let appstyle;
    	let t;
    	let screen_1;
    	let current;

    	appstyle = new App_style$1({
    			props: { baseline: Baseline$1, theme: /*$theme*/ ctx[0] }
    		});

    	let screen_1_props = {
    		full: true,
    		$$slots: {
    			title: [create_title_slot],
    			default: [create_default_slot_4]
    		},
    		$$scope: { ctx }
    	};

    	screen_1 = new Screen$1({ props: screen_1_props });
    	/*screen_1_binding*/ ctx[4](screen_1);

    	return {
    		c() {
    			create_component(appstyle.$$.fragment);
    			t = space();
    			create_component(screen_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appstyle, target, anchor);
    			insert(target, t, anchor);
    			mount_component(screen_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const appstyle_changes = {};
    			if (dirty & /*$theme*/ 1) appstyle_changes.theme = /*$theme*/ ctx[0];
    			appstyle.$set(appstyle_changes);
    			const screen_1_changes = {};

    			if (dirty & /*$$scope, $view*/ 36) {
    				screen_1_changes.$$scope = { dirty, ctx };
    			}

    			screen_1.$set(screen_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appstyle.$$.fragment, local);
    			transition_in(screen_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appstyle.$$.fragment, local);
    			transition_out(screen_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appstyle, detaching);
    			if (detaching) detach(t);
    			/*screen_1_binding*/ ctx[4](null);
    			destroy_component(screen_1, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $theme;
    	let $screen;
    	let $view;
    	component_subscribe($$self, theme, $$value => $$invalidate(0, $theme = $$value));
    	component_subscribe($$self, screen$1, $$value => $$invalidate(1, $screen = $$value));
    	component_subscribe($$self, view, $$value => $$invalidate(2, $view = $$value));
    	const openMenu = () => drawer.open(Menu);

    	function screen_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$screen = $$value;
    			screen$1.set($screen);
    		});
    	}

    	return [$theme, $screen, $view, openMenu, screen_1_binding];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
    	}
    }

    new App({
        target: document.body
    });

})();
