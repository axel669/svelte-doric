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
        node.parentNode.removeChild(node);
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
    function hash(str) {
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
        const name = `__svelte_${hash(rule)}_${uid}`;
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
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
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
                        config = config();
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
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

    /* core\portal.svelte generated by Svelte v3.51.0 */

    function create_fragment$L(ctx) {
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

    class Portal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$L, safe_not_equal, {});
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

    /* core\modal.svelte generated by Svelte v3.51.0 */

    function add_css$g(target) {
    	append_styles(target, "svelte-1m4blp0", "modal-wrapper.svelte-1m4blp0{position:fixed;top:0px;left:0px;width:100vw;height:100vh;background-color:rgba(0, 0, 0, 0.35);z-index:500}modal-wrapper.clear.svelte-1m4blp0{background-color:transparent}");
    }

    function create_fragment$K(ctx) {
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
    			set_custom_element_data(modal_wrapper, "class", "svelte-1m4blp0");
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
    					listen(div, "tap", stop_propagation(/*tap_handler*/ ctx[6])),
    					action_destroyer(portal.call(null, modal_wrapper)),
    					listen(modal_wrapper, "tap", /*close*/ ctx[2])
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

    function instance$J($$self, $$props, $$invalidate) {
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

    	function tap_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('clear' in $$props) $$invalidate(0, clear = $$props.clear);
    		if ('persistent' in $$props) $$invalidate(3, persistent = $$props.persistent);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [clear, anim, close, persistent, $$scope, slots, tap_handler];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$J, create_fragment$K, safe_not_equal, { clear: 0, persistent: 3 }, add_css$g);
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.51.0 */

    function add_css$f(target) {
    	append_styles(target, "svelte-6khfl4", "drawer-wrapper.svelte-6khfl4{position:absolute;top:0px;left:0px;height:100vh;min-width:10vw;background-color:var(--card-background)}");
    }

    // (56:0) {#if current !== null}
    function create_if_block$6(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot$7] },
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

    // (57:4) <Modal on:close={() => close(undefined)}>
    function create_default_slot$7(ctx) {
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
    			set_custom_element_data(drawer_wrapper, "class", "svelte-6khfl4");
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
    				if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, drawerSlide, {}, true);
    				drawer_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, drawerSlide, {}, false);
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

    function create_fragment$J(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*current*/ ctx[0] !== null && create_if_block$6(ctx);

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

    const drawerSlide = (node, options) => {
    	return {
    		delay: 0,
    		duration: 250,
    		css: (t, u) => `
                transform: translateX(-${u * 100}%);
                opacity: ${t};
            `
    	};
    };

    let show;
    const openDrawer = (...args) => show(...args);

    function instance$I($$self, $$props, $$invalidate) {
    	let current = null;
    	let props = {};
    	let close = null;

    	show = (component, opts) => new Promise(resolve => {
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

    class Drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$I, create_fragment$J, safe_not_equal, {}, add_css$f);
    	}
    }

    /* core\dialog.svelte generated by Svelte v3.51.0 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i].component;
    	child_ctx[4] = list[i].modalClose;
    	child_ctx[5] = list[i].persistent;
    	child_ctx[6] = list[i].props;
    	return child_ctx;
    }

    // (45:4) <Modal {persistent} on:close={modalClose}>
    function create_default_slot$6(ctx) {
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
    function create_each_block$4(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				persistent: /*persistent*/ ctx[5],
    				$$slots: { default: [create_default_slot$6] },
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

    function create_fragment$I(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*dialogs*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
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
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
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

    function instance$H($$self, $$props, $$invalidate) {
    	let dialogs = [];

    	return [dialogs];
    }

    class Dialog extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$H, create_fragment$I, safe_not_equal, {});
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

    /* core\ripple.svelte generated by Svelte v3.51.0 */

    function add_css$e(target) {
    	append_styles(target, "svelte-acwzgw", "ripple-wrapper.svelte-acwzgw{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-acwzgw{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}");
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (107:4) {#each ripples as info (info.id)}
    function create_each_block$3(key_1, ctx) {
    	let ripple;
    	let vars_action;
    	let ripple_intro;
    	let mounted;
    	let dispose;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			ripple = element("ripple");
    			attr(ripple, "class", "svelte-acwzgw");
    			this.first = ripple;
    		},
    		m(target, anchor) {
    			insert(target, ripple, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, ripple, /*rippleVars*/ ctx[4](/*info*/ ctx[8], /*color*/ ctx[0])));
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (vars_action && is_function(vars_action.update) && dirty & /*ripples, color*/ 3) vars_action.update.call(null, /*rippleVars*/ ctx[4](/*info*/ ctx[8], /*color*/ ctx[0]));
    		},
    		i(local) {
    			if (!ripple_intro) {
    				add_render_callback(() => {
    					ripple_intro = create_in_transition(ripple, customAnimation, {});
    					ripple_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$H(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[8].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	return {
    		c() {
    			ripple_wrapper = element("ripple-wrapper");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(ripple_wrapper, "class", "svelte-acwzgw");
    		},
    		m(target, anchor) {
    			insert(target, ripple_wrapper, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ripple_wrapper, null);
    			}

    			/*ripple_wrapper_binding*/ ctx[6](ripple_wrapper);

    			if (!mounted) {
    				dispose = listen(ripple_wrapper, "pointer-start", /*addRipple*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*rippleVars, ripples, color*/ 19) {
    				each_value = /*ripples*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block$3, null, get_each_context$3);
    			}
    		},
    		i(local) {
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ripple_wrapper);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*ripple_wrapper_binding*/ ctx[6](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const calcOffset = touch => {
    	const { target, clientX, clientY } = touch;
    	const rect = target.getBoundingClientRect();
    	const x = clientX - rect.left;
    	const y = clientY - rect.top;
    	return { x, y };
    };

    const customAnimation = (node, options) => {
    	return {
    		delay: 0,
    		duration: 500,
    		css: (t, u) => `
                transform: translate3d(-50%, -50%, 0) scale(${1 - u ** 1.3});
                opacity: ${u ** 1.3};
            `
    	};
    };

    const duration$1 = 500;

    function instance$G($$self, $$props, $$invalidate) {
    	let { color = null } = $$props;
    	let { disabled = false } = $$props;
    	let ripples = [];
    	let container = null;

    	const addRipple = evt => {
    		if (disabled === true) {
    			return;
    		}

    		for (const touch of evt.changedTouches) {
    			const { x, y } = calcOffset(touch);
    			const size = Math.max(container.offsetWidth, container.offsetHeight) * 2;
    			const ripple = { id: Date.now(), x, y, size };
    			$$invalidate(1, ripples = [...ripples, ripple]);
    			setTimeout(() => $$invalidate(1, ripples = ripples.filter(r => r !== ripple)), duration$1);
    		}
    	};

    	const rippleVars = (info, color) => ({
    		"x": [info.x, "px"],
    		"y": [info.y, "px"],
    		"size": [info.size, "px"],
    		"ripple-color": color
    	});

    	function ripple_wrapper_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(2, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('disabled' in $$props) $$invalidate(5, disabled = $$props.disabled);
    	};

    	return [
    		color,
    		ripples,
    		container,
    		addRipple,
    		rippleVars,
    		disabled,
    		ripple_wrapper_binding
    	];
    }

    class Ripple extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$G, create_fragment$H, safe_not_equal, { color: 0, disabled: 5 }, add_css$e);
    	}
    }

    /* core\action-area.svelte generated by Svelte v3.51.0 */

    function add_css$d(target) {
    	append_styles(target, "svelte-qjr29k", "action-area.svelte-qjr29k{--ripple-color:var(--ripple-normal);display:grid;overflow:hidden;position:relative;cursor:pointer}");
    }

    function create_fragment$G(ctx) {
    	let action_area;
    	let t;
    	let ripple;
    	let action_area_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	ripple = new Ripple({});

    	return {
    		c() {
    			action_area = element("action-area");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(action_area, "class", action_area_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-qjr29k"));
    		},
    		m(target, anchor) {
    			insert(target, action_area, anchor);

    			if (default_slot) {
    				default_slot.m(action_area, null);
    			}

    			append(action_area, t);
    			mount_component(ripple, action_area, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(action_area, "tap", /*tap_handler*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
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

    			if (!current || dirty & /*klass*/ 1 && action_area_class_value !== (action_area_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-qjr29k"))) {
    				set_custom_element_data(action_area, "class", action_area_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(action_area);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$F($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;

    	function tap_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('class' in $$props) $$invalidate(0, klass = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [klass, $$scope, slots, tap_handler];
    }

    class Action_area extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$F, create_fragment$G, safe_not_equal, { class: 0 }, add_css$d);
    	}
    }

    /* core\adornment.svelte generated by Svelte v3.51.0 */

    function add_css$c(target) {
    	append_styles(target, "svelte-18ttflk", "doric-adornment.svelte-18ttflk{display:grid;padding:4px}doric-adornment.flush.svelte-18ttflk{padding:0px}");
    }

    function create_fragment$F(ctx) {
    	let doric_adornment;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			doric_adornment = element("doric-adornment");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_adornment, "class", "svelte-18ttflk");
    			toggle_class(doric_adornment, "flush", /*flush*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, doric_adornment, anchor);

    			if (default_slot) {
    				default_slot.m(doric_adornment, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
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

    			if (!current || dirty & /*flush*/ 1) {
    				toggle_class(doric_adornment, "flush", /*flush*/ ctx[0]);
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
    			if (detaching) detach(doric_adornment);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$E($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { flush } = $$props;

    	$$self.$$set = $$props => {
    		if ('flush' in $$props) $$invalidate(0, flush = $$props.flush);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [flush, $$scope, slots];
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$E, create_fragment$F, safe_not_equal, { flush: 0 }, add_css$c);
    	}
    }

    /* core\app-bar.svelte generated by Svelte v3.51.0 */

    function add_css$b(target) {
    	append_styles(target, "svelte-hghu4m", "doric-app-bar.svelte-hghu4m{position:relative;z-index:+0;grid-template-rows:56px min-content;background-color:var(--title-bar-background);color:var(--title-bar-text);display:grid;box-shadow:0px 2px 2px var(--shadow-color)}doric-app-bar.svelte-hghu4m:not(.compact) doric-adornment > *:not([ignore-titlebar-reskin]){--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark);--control-border:var(--title-bar-text);--control-border-focus:var(--title-bar-text)}title-area.svelte-hghu4m{display:grid;grid-template-columns:max-content auto max-content}title-text.svelte-hghu4m{font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}title-text.center.svelte-hghu4m{justify-content:center}");
    }

    const get_extension_slot_changes$1 = dirty => ({});
    const get_extension_slot_context$1 = ctx => ({});
    const get_action_slot_changes$2 = dirty => ({});
    const get_action_slot_context$2 = ctx => ({});
    const get_menu_slot_changes$1 = dirty => ({});
    const get_menu_slot_context$1 = ctx => ({});

    // (44:26)               
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

    // (50:28)               
    function fallback_block$2(ctx) {
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

    function create_fragment$E(ctx) {
    	let doric_app_bar;
    	let title_area;
    	let t0;
    	let title_text;
    	let t1;
    	let t2;
    	let current;
    	const menu_slot_template = /*#slots*/ ctx[2].menu;
    	const menu_slot = create_slot(menu_slot_template, ctx, /*$$scope*/ ctx[1], get_menu_slot_context$1);
    	const menu_slot_or_fallback = menu_slot || fallback_block_1$2();
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	const action_slot_template = /*#slots*/ ctx[2].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[1], get_action_slot_context$2);
    	const action_slot_or_fallback = action_slot || fallback_block$2();
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
    			set_custom_element_data(title_text, "class", "svelte-hghu4m");
    			toggle_class(title_text, "center", /*center*/ ctx[0]);
    			set_custom_element_data(title_area, "class", "svelte-hghu4m");
    			set_custom_element_data(doric_app_bar, "class", "svelte-hghu4m");
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

    function instance$D($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { center } = $$props;

    	$$self.$$set = $$props => {
    		if ('center' in $$props) $$invalidate(0, center = $$props.center);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [center, $$scope, slots];
    }

    class App_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$D, create_fragment$E, safe_not_equal, { center: 0 }, add_css$b);
    	}
    }

    var nvalue = (value, defValue) => {
        if (value === null || value === undefined) {
            return defValue
        }
        return value
    };

    const touchState = {};

    if (typeof window !== "undefined") {
        const pointerStart = "pointer-start";
        const pointerEnd = "pointer-end";
        const evtOptions = {bubbles: true};

        const isMobile = (window.ontouchstart !== undefined);
        const sourceEvents = isMobile
            ? {down: "touchstart", up: "touchend"}
            : {down: "mousedown", up: "mouseup"};

        window.addEventListener(
            sourceEvents.down,
            evt => {
                if (isMobile === false && evt.button !== 0) {
                    return
                }
                const customEvent = new CustomEvent(pointerStart, evtOptions);
                evt.identifier = nvalue(evt.identifier, -1);
                customEvent.changedTouches = isMobile ? evt.changedTouches : [evt];
                evt.target.dispatchEvent(customEvent);
            },
            {capture: true}
        );
        window.addEventListener(
            sourceEvents.up,
            evt => {
                if (isMobile === false && evt.button !== 0) {
                    return
                }
                const customEvent = new CustomEvent(pointerEnd, evtOptions);
                evt.identifier = nvalue(evt.identifier, -1);
                customEvent.changedTouches = isMobile ? evt.changedTouches : [evt];
                evt.target.dispatchEvent(customEvent);
            },
            {capture: true}
        );

        window.addEventListener(
            pointerStart,
            evt => {
                const timestamp = Date.now();
                for (const touch of evt.changedTouches) {
                    touchState[touch.identifier] = {
                        timestamp,
                        touch,
                    };
                }
            },
            {capture: true}
        );
        window.addEventListener(
            pointerEnd,
            evt => {
                const timestamp = Date.now();
                for (const touch of evt.changedTouches) {
                    const prev = touchState[touch.identifier];
                    touchState[touch.identifier] = null;

                    if (prev === null || prev === undefined) {
                        return
                    }

                    const duration = timestamp - prev.timestamp;
                    const dist = Math.sqrt(
                        (prev.touch.clientX - touch.clientX) ** 2
                        + (prev.touch.clientY - touch.clientY) ** 2
                    );
                    if (dist > 30 || duration > 500) {
                        return
                    }

                    const customEvent = new CustomEvent("tap", evtOptions);
                    customEvent.changedTouches = [touch];
                    touch.target.dispatchEvent(customEvent);
                }
            },
            {capture: true}
        );
    }

    /* core\app-style.svelte generated by Svelte v3.51.0 */

    function create_fragment$D(ctx) {
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

    	portal = new Portal({});
    	dialog = new Dialog({});
    	drawer = new Drawer({});

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

    function instance$C($$self, $$props, $$invalidate) {
    	let { theme = null } = $$props;
    	let { baseline = null } = $$props;

    	$$self.$$set = $$props => {
    		if ('theme' in $$props) $$invalidate(0, theme = $$props.theme);
    		if ('baseline' in $$props) $$invalidate(1, baseline = $$props.baseline);
    	};

    	return [theme, baseline];
    }

    class App_style extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$C, create_fragment$D, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

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

    /* core\baseline.svelte generated by Svelte v3.51.0 */

    function add_css$a(target) {
    	append_styles(target, "svelte-1rfls5p", "*{box-sizing:border-box;flex-shrink:0}html{margin:0px;padding:0px;width:100%;height:100%;overflow:hidden}body{position:fixed;margin:0px;padding:0px;width:100%;height:100%;overflow:hidden;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--layer-border-color);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert);--shadow-color:rgba(0, 0, 0, 0.25)}");
    }

    function create_fragment$C(ctx) {
    	let link0;
    	let link1;
    	let link2;
    	let t;
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			t = space();
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
    			insert(target, t, anchor);
    			html_tag.m(/*subPixelFix*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			detach(link0);
    			detach(link1);
    			detach(link2);
    			if (detaching) detach(t);
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$B($$self) {
    	const lastDigit = Math.ceil(screen.width * devicePixelRatio * 10) % 10;
    	const roundDown = lastDigit >= 5;

    	const subPixelFix = css`
        body {
            --sub-pixel-offset: ${roundDown ? 1 : 0}px;
        }
    `;

    	return [subPixelFix];
    }

    class Baseline extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$B, create_fragment$C, safe_not_equal, {}, add_css$a);
    	}
    }

    /* core\button.svelte generated by Svelte v3.51.0 */

    function add_css$9(target) {
    	append_styles(target, "svelte-17wuj76", "doric-button.svelte-17wuj76{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;z-index:+0;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}.round.svelte-17wuj76{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.compact.svelte-17wuj76{width:var(--button-round-size);padding:4px 8px}.adorn.svelte-17wuj76{padding-top:2px;padding-bottom:2px}.disabled.svelte-17wuj76{opacity:0.5}.primary.svelte-17wuj76{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-17wuj76{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-17wuj76{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-17wuj76{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--button-filled-text-color)}.outline.svelte-17wuj76{border:1px solid var(--button-color);color:var(--button-color)}.square.svelte-17wuj76{border-radius:0px}");
    }

    function create_fragment$B(ctx) {
    	let doric_button;
    	let t;
    	let ripple;
    	let doric_button_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[3] } });

    	return {
    		c() {
    			doric_button = element("doric-button");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(doric_button, "class", doric_button_class_value = "" + (/*color*/ ctx[1] + " " + /*variant*/ ctx[6] + " svelte-17wuj76"));
    			toggle_class(doric_button, "disabled", /*disabled*/ ctx[3]);
    			toggle_class(doric_button, "round", /*round*/ ctx[4]);
    			toggle_class(doric_button, "compact", /*compact*/ ctx[2]);
    			toggle_class(doric_button, "adorn", /*adorn*/ ctx[0]);
    			toggle_class(doric_button, "square", /*square*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, doric_button, anchor);

    			if (default_slot) {
    				default_slot.m(doric_button, null);
    			}

    			append(doric_button, t);
    			mount_component(ripple, doric_button, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(doric_button, "tap", /*handleTap*/ ctx[8]),
    					action_destroyer(vars_action = vars.call(null, doric_button, /*buttonVars*/ ctx[7]))
    				];

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
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, null),
    						null
    					);
    				}
    			}

    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 8) ripple_changes.disabled = /*disabled*/ ctx[3];
    			ripple.$set(ripple_changes);

    			if (!current || dirty & /*color, variant*/ 66 && doric_button_class_value !== (doric_button_class_value = "" + (/*color*/ ctx[1] + " " + /*variant*/ ctx[6] + " svelte-17wuj76"))) {
    				set_custom_element_data(doric_button, "class", doric_button_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 128) vars_action.update.call(null, /*buttonVars*/ ctx[7]);

    			if (!current || dirty & /*color, variant, disabled*/ 74) {
    				toggle_class(doric_button, "disabled", /*disabled*/ ctx[3]);
    			}

    			if (!current || dirty & /*color, variant, round*/ 82) {
    				toggle_class(doric_button, "round", /*round*/ ctx[4]);
    			}

    			if (!current || dirty & /*color, variant, compact*/ 70) {
    				toggle_class(doric_button, "compact", /*compact*/ ctx[2]);
    			}

    			if (!current || dirty & /*color, variant, adorn*/ 67) {
    				toggle_class(doric_button, "adorn", /*adorn*/ ctx[0]);
    			}

    			if (!current || dirty & /*color, variant, square*/ 98) {
    				toggle_class(doric_button, "square", /*square*/ ctx[5]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_button);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$A($$self, $$props, $$invalidate) {
    	let buttonVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { adorn } = $$props;
    	let { buttonColor = null } = $$props;
    	let { color = "default" } = $$props;
    	let { compact } = $$props;
    	let { disabled = false } = $$props;
    	let { round } = $$props;
    	let { square } = $$props;
    	let { variant = "normal" } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		// Mobile browsers don't like dispatching events inside custom events
    		setTimeout(() => dispatch("tap", evt), 0);
    	};

    	$$self.$$set = $$props => {
    		if ('adorn' in $$props) $$invalidate(0, adorn = $$props.adorn);
    		if ('buttonColor' in $$props) $$invalidate(9, buttonColor = $$props.buttonColor);
    		if ('color' in $$props) $$invalidate(1, color = $$props.color);
    		if ('compact' in $$props) $$invalidate(2, compact = $$props.compact);
    		if ('disabled' in $$props) $$invalidate(3, disabled = $$props.disabled);
    		if ('round' in $$props) $$invalidate(4, round = $$props.round);
    		if ('square' in $$props) $$invalidate(5, square = $$props.square);
    		if ('variant' in $$props) $$invalidate(6, variant = $$props.variant);
    		if ('$$scope' in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*round, buttonColor*/ 528) {
    			$$invalidate(7, buttonVars = {
    				"button-round-size": round,
    				"button-color": buttonColor
    			});
    		}
    	};

    	return [
    		adorn,
    		color,
    		compact,
    		disabled,
    		round,
    		square,
    		variant,
    		buttonVars,
    		handleTap,
    		buttonColor,
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
    			instance$A,
    			create_fragment$B,
    			safe_not_equal,
    			{
    				adorn: 0,
    				buttonColor: 9,
    				color: 1,
    				compact: 2,
    				disabled: 3,
    				round: 4,
    				square: 5,
    				variant: 6
    			},
    			add_css$9
    		);
    	}
    }

    /* core\icon.svelte generated by Svelte v3.51.0 */

    function add_css$8(target) {
    	append_styles(target, "svelte-od4xq0", "doric-icon.svelte-od4xq0{margin:0px 4px;font-size:var(--icon-font-size)}");
    }

    function create_fragment$A(ctx) {
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

    function instance$z($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$z, create_fragment$A, safe_not_equal, { name: 3, size: 4 }, add_css$8);
    	}
    }

    /* core\text.svelte generated by Svelte v3.51.0 */

    function add_css$7(target) {
    	append_styles(target, "svelte-1f0mp8e", "span.svelte-1f0mp8e{color:var(--typography-color);font-size:var(--typography-size)}.block.svelte-1f0mp8e{display:block}.subtitle.svelte-1f0mp8e{font-size:var(--text-size-subtitle)}.primary.svelte-1f0mp8e{color:var(--primary)}.secondary.svelte-1f0mp8e{color:var(--secondary)}.danger.svelte-1f0mp8e{color:var(--danger)}.left.svelte-1f0mp8e{text-align:left}.right.svelte-1f0mp8e{text-align:right}.center.svelte-1f0mp8e{text-align:center}.adorn.svelte-1f0mp8e{display:flex;align-items:center;justify-content:center}");
    }

    function create_fragment$z(ctx) {
    	let span;
    	let span_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	return {
    		c() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr(span, "class", span_class_value = "" + (/*color*/ ctx[3] + " " + /*align*/ ctx[1] + " svelte-1f0mp8e"));
    			toggle_class(span, "block", /*block*/ ctx[2]);
    			toggle_class(span, "adorn", /*adorn*/ ctx[0]);
    			toggle_class(span, "subtitle", /*subtitle*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, span, /*textOpts*/ ctx[5]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*color, align*/ 10 && span_class_value !== (span_class_value = "" + (/*color*/ ctx[3] + " " + /*align*/ ctx[1] + " svelte-1f0mp8e"))) {
    				attr(span, "class", span_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*textOpts*/ 32) vars_action.update.call(null, /*textOpts*/ ctx[5]);

    			if (!current || dirty & /*color, align, block*/ 14) {
    				toggle_class(span, "block", /*block*/ ctx[2]);
    			}

    			if (!current || dirty & /*color, align, adorn*/ 11) {
    				toggle_class(span, "adorn", /*adorn*/ ctx[0]);
    			}

    			if (!current || dirty & /*color, align, subtitle*/ 26) {
    				toggle_class(span, "subtitle", /*subtitle*/ ctx[4]);
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
    			dispose();
    		}
    	};
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let textOpts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { adorn } = $$props;
    	let { align = "left" } = $$props;
    	let { block = false } = $$props;
    	let { color = "" } = $$props;
    	let { subtitle = false } = $$props;
    	let { textColor = null } = $$props;
    	let { textSize = null } = $$props;

    	$$self.$$set = $$props => {
    		if ('adorn' in $$props) $$invalidate(0, adorn = $$props.adorn);
    		if ('align' in $$props) $$invalidate(1, align = $$props.align);
    		if ('block' in $$props) $$invalidate(2, block = $$props.block);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    		if ('subtitle' in $$props) $$invalidate(4, subtitle = $$props.subtitle);
    		if ('textColor' in $$props) $$invalidate(6, textColor = $$props.textColor);
    		if ('textSize' in $$props) $$invalidate(7, textSize = $$props.textSize);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*textColor, textSize*/ 192) {
    			$$invalidate(5, textOpts = {
    				"typography-color": textColor,
    				"typography-size": textSize
    			});
    		}
    	};

    	return [
    		adorn,
    		align,
    		block,
    		color,
    		subtitle,
    		textOpts,
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
    			instance$y,
    			create_fragment$z,
    			safe_not_equal,
    			{
    				adorn: 0,
    				align: 1,
    				block: 2,
    				color: 3,
    				subtitle: 4,
    				textColor: 6,
    				textSize: 7
    			},
    			add_css$7
    		);
    	}
    }

    /* core\layout\flex.svelte generated by Svelte v3.51.0 */

    function add_css$6(target) {
    	append_styles(target, "svelte-31sv75", "flex-layout.svelte-31sv75{display:flex;flex-wrap:nowrap;overflow:hidden;flex-direction:var(--direction);padding:var(--padding);gap:var(--gap);align-items:var(--item-align);justify-content:var(--item-justify);align-content:var(--content-align)}flex-layout.item-fill.svelte-31sv75>*{flex-grow:1}flex-layout.scrollable.svelte-31sv75{overflow:auto;-webkit-overflow-scrolling:touch;height:100%;scroll-behavior:auto}flex-layout.wrap.svelte-31sv75{flex-wrap:wrap}flex-layout.center.svelte-31sv75{align-items:center;justify-content:center}flex-layout.svelte-31sv75>flex-break,flex-layout.item-fill.svelte-31sv75>flex-break{flex-basis:100%;height:0;width:0}");
    }

    function create_fragment$y(ctx) {
    	let flex_layout;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

    	return {
    		c() {
    			flex_layout = element("flex-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(flex_layout, "class", "svelte-31sv75");
    			toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[1]);
    			toggle_class(flex_layout, "scrollable", /*scrollable*/ ctx[2]);
    			toggle_class(flex_layout, "wrap", /*wrap*/ ctx[3]);
    			toggle_class(flex_layout, "center", /*center*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, flex_layout, anchor);

    			if (default_slot) {
    				default_slot.m(flex_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, flex_layout, /*flexVars*/ ctx[4]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[11],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
    						null
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*flexVars*/ 16) vars_action.update.call(null, /*flexVars*/ ctx[4]);

    			if (!current || dirty & /*itemFill*/ 2) {
    				toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[1]);
    			}

    			if (!current || dirty & /*scrollable*/ 4) {
    				toggle_class(flex_layout, "scrollable", /*scrollable*/ ctx[2]);
    			}

    			if (!current || dirty & /*wrap*/ 8) {
    				toggle_class(flex_layout, "wrap", /*wrap*/ ctx[3]);
    			}

    			if (!current || dirty & /*center*/ 1) {
    				toggle_class(flex_layout, "center", /*center*/ ctx[0]);
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
    			dispose();
    		}
    	};
    }

    function instance$x($$self, $$props, $$invalidate) {
    	let flexVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { center = false } = $$props;
    	let { contentAlign = null } = $$props;
    	let { direction = "column" } = $$props;
    	let { gap = "4px" } = $$props;
    	let { itemAlign = null } = $$props;
    	let { itemFill = false } = $$props;
    	let { itemJustify = null } = $$props;
    	let { padding = "4px" } = $$props;
    	let { scrollable = false } = $$props;
    	let { wrap = false } = $$props;

    	$$self.$$set = $$props => {
    		if ('center' in $$props) $$invalidate(0, center = $$props.center);
    		if ('contentAlign' in $$props) $$invalidate(5, contentAlign = $$props.contentAlign);
    		if ('direction' in $$props) $$invalidate(6, direction = $$props.direction);
    		if ('gap' in $$props) $$invalidate(7, gap = $$props.gap);
    		if ('itemAlign' in $$props) $$invalidate(8, itemAlign = $$props.itemAlign);
    		if ('itemFill' in $$props) $$invalidate(1, itemFill = $$props.itemFill);
    		if ('itemJustify' in $$props) $$invalidate(9, itemJustify = $$props.itemJustify);
    		if ('padding' in $$props) $$invalidate(10, padding = $$props.padding);
    		if ('scrollable' in $$props) $$invalidate(2, scrollable = $$props.scrollable);
    		if ('wrap' in $$props) $$invalidate(3, wrap = $$props.wrap);
    		if ('$$scope' in $$props) $$invalidate(11, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction, padding, gap, itemAlign, itemJustify, contentAlign*/ 2016) {
    			$$invalidate(4, flexVars = {
    				direction,
    				padding,
    				gap,
    				"item-align": itemAlign,
    				"item-justify": itemJustify,
    				"content-align": contentAlign
    			});
    		}
    	};

    	return [
    		center,
    		itemFill,
    		scrollable,
    		wrap,
    		flexVars,
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

    class Flex extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$x,
    			create_fragment$y,
    			safe_not_equal,
    			{
    				center: 0,
    				contentAlign: 5,
    				direction: 6,
    				gap: 7,
    				itemAlign: 8,
    				itemFill: 1,
    				itemJustify: 9,
    				padding: 10,
    				scrollable: 2,
    				wrap: 3
    			},
    			add_css$6
    		);
    	}
    }

    /* core\paper.svelte generated by Svelte v3.51.0 */

    function add_css$5(target) {
    	append_styles(target, "svelte-19n5sot", "doric-paper.svelte-19n5sot{display:grid;border-radius:4px;border-style:solid;border-width:0px;box-shadow:0px 2px 4px var(--shadow-color);overflow:hidden;grid-template-columns:1fr;grid-template-rows:min-content auto min-content;background-color:var(--card-background);border-color:var(--border-color, var(--layer-border-color))}doric-paper.card.svelte-19n5sot{border-width:var(--layer-border-width)}doric-paper.square.svelte-19n5sot{border-radius:0px}doric-paper.center.svelte-19n5sot{margin:auto}doric-paper.flat.svelte-19n5sot{box-shadow:none}doric-paper.scrollable.svelte-19n5sot{max-height:100%;overflow:auto}content-wrapper.svelte-19n5sot{display:grid;overflow:hidden}");
    }

    const get_action_slot_changes$1 = dirty => ({});
    const get_action_slot_context$1 = ctx => ({});
    const get_title_slot_changes$1 = dirty => ({});
    const get_title_slot_context$1 = ctx => ({});

    // (77:23)           
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

    // (81:8) <svelte:component this={layout} {...layoutProps}>
    function create_default_slot$5(ctx) {
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

    // (85:24)           
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

    function create_fragment$x(ctx) {
    	let doric_paper;
    	let t0;
    	let content_wrapper;
    	let switch_instance;
    	let t1;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const title_slot_template = /*#slots*/ ctx[9].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[10], get_title_slot_context$1);
    	const title_slot_or_fallback = title_slot || fallback_block_1$1();
    	const switch_instance_spread_levels = [/*layoutProps*/ ctx[7]];
    	var switch_value = /*layout*/ ctx[3];

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot$5] },
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
    	const action_slot_or_fallback = action_slot || fallback_block$1();

    	return {
    		c() {
    			doric_paper = element("doric-paper");
    			if (title_slot_or_fallback) title_slot_or_fallback.c();
    			t0 = space();
    			content_wrapper = element("content-wrapper");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t1 = space();
    			if (action_slot_or_fallback) action_slot_or_fallback.c();
    			set_custom_element_data(content_wrapper, "class", "svelte-19n5sot");
    			set_custom_element_data(doric_paper, "class", "svelte-19n5sot");
    			toggle_class(doric_paper, "card", /*card*/ ctx[0]);
    			toggle_class(doric_paper, "center", /*center*/ ctx[1]);
    			toggle_class(doric_paper, "flat", /*flat*/ ctx[2]);
    			toggle_class(doric_paper, "square", /*square*/ ctx[5]);
    			toggle_class(doric_paper, "scrollable", /*scrollable*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, doric_paper, anchor);

    			if (title_slot_or_fallback) {
    				title_slot_or_fallback.m(doric_paper, null);
    			}

    			append(doric_paper, t0);
    			append(doric_paper, content_wrapper);
    			if (switch_instance) mount_component(switch_instance, content_wrapper, null);
    			append(doric_paper, t1);

    			if (action_slot_or_fallback) {
    				action_slot_or_fallback.m(doric_paper, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_paper, /*variables*/ ctx[6]));
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

    			const switch_instance_changes = (dirty & /*layoutProps*/ 128)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*layoutProps*/ ctx[7])])
    			: {};

    			if (dirty & /*$$scope*/ 1024) {
    				switch_instance_changes.$$scope = { dirty, ctx };
    			}

    			if (switch_value !== (switch_value = /*layout*/ ctx[3])) {
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
    					mount_component(switch_instance, content_wrapper, null);
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

    			if (vars_action && is_function(vars_action.update) && dirty & /*variables*/ 64) vars_action.update.call(null, /*variables*/ ctx[6]);

    			if (!current || dirty & /*card*/ 1) {
    				toggle_class(doric_paper, "card", /*card*/ ctx[0]);
    			}

    			if (!current || dirty & /*center*/ 2) {
    				toggle_class(doric_paper, "center", /*center*/ ctx[1]);
    			}

    			if (!current || dirty & /*flat*/ 4) {
    				toggle_class(doric_paper, "flat", /*flat*/ ctx[2]);
    			}

    			if (!current || dirty & /*square*/ 32) {
    				toggle_class(doric_paper, "square", /*square*/ ctx[5]);
    			}

    			if (!current || dirty & /*scrollable*/ 16) {
    				toggle_class(doric_paper, "scrollable", /*scrollable*/ ctx[4]);
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
    			dispose();
    		}
    	};
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let variables;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { card } = $$props;
    	let { center } = $$props;
    	let { flat } = $$props;
    	let { layout = Flex } = $$props;
    	let { scrollable } = $$props;
    	let { square } = $$props;
    	let { borderColor = null } = $$props;
    	const layoutProps = Object.fromEntries(Object.entries($$props).filter(([key]) => key.startsWith("l") && key !== "layout").map(([key, value]) => [key.slice(1), value]));

    	$$self.$$set = $$new_props => {
    		$$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('card' in $$new_props) $$invalidate(0, card = $$new_props.card);
    		if ('center' in $$new_props) $$invalidate(1, center = $$new_props.center);
    		if ('flat' in $$new_props) $$invalidate(2, flat = $$new_props.flat);
    		if ('layout' in $$new_props) $$invalidate(3, layout = $$new_props.layout);
    		if ('scrollable' in $$new_props) $$invalidate(4, scrollable = $$new_props.scrollable);
    		if ('square' in $$new_props) $$invalidate(5, square = $$new_props.square);
    		if ('borderColor' in $$new_props) $$invalidate(8, borderColor = $$new_props.borderColor);
    		if ('$$scope' in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*borderColor*/ 256) {
    			$$invalidate(6, variables = { "border-color": borderColor });
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		card,
    		center,
    		flat,
    		layout,
    		scrollable,
    		square,
    		variables,
    		layoutProps,
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
    			instance$w,
    			create_fragment$x,
    			safe_not_equal,
    			{
    				card: 0,
    				center: 1,
    				flat: 2,
    				layout: 3,
    				scrollable: 4,
    				square: 5,
    				borderColor: 8
    			},
    			add_css$5
    		);
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable$1(value, start) {
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
        return readable$1(initial_value, (set) => {
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

    /* core\screen.svelte generated by Svelte v3.51.0 */

    function add_css$4(target) {
    	append_styles(target, "svelte-vxf966", "doric-screen.svelte-vxf966{display:grid;width:calc(100% - var(--sub-pixel-offset));height:calc(100% - 1px);overflow:hidden;position:absolute;background-color:rgba(0, 0, 0, 0.5);grid-template-columns:auto\n            min(\n                calc(\n                    var(--parent-width) - calc(16px * var(--stack))\n                ),\n                var(--screen-width)\n            )\n            auto\n        ;grid-template-rows:min-content auto min-content;grid-template-areas:var(--title-row, \". title .\")\n            var(--content-row, \". content .\")\n            var(--footer-row, \". footer .\")\n        ;padding-top:calc(8px * var(--stack));padding-bottom:0px}doric-screen.main.svelte-vxf966{background-color:transparent}.full-title.svelte-vxf966,.full.svelte-vxf966{--title-row:\"title title title\"}.full-content.svelte-vxf966,.full.svelte-vxf966{--content-row:\"content content content\"}.full-footer.svelte-vxf966,.full.svelte-vxf966{--footer-row:\"footer footer footer\"}title-area.svelte-vxf966{display:grid;grid-area:title}footer-area.svelte-vxf966{display:grid;grid-area:footer}content-area.svelte-vxf966{display:grid;grid-area:content;height:100%;overflow:hidden}");
    }

    const get_footer_slot_changes = dirty => ({});
    const get_footer_slot_context = ctx => ({});
    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});

    // (133:4) {#if $$slots.title}
    function create_if_block_1$2(ctx) {
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

    // (141:4) {#if $$slots.footer}
    function create_if_block$5(ctx) {
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

    function create_fragment$w(ctx) {
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
    	let if_block0 = /*$$slots*/ ctx[10].title && create_if_block_1$2(ctx);
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);
    	let if_block1 = /*$$slots*/ ctx[10].footer && create_if_block$5(ctx);
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
    					if_block0 = create_if_block_1$2(ctx);
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
    					if_block1 = create_if_block$5(ctx);
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

    const closeContext = Symbol("Close Context");
    const levelContext = Symbol("Level Context");
    const widthContext = Symbol("Width Context");
    const duration = 350;

    function instance$v($$self, $$props, $$invalidate) {
    	let screenVars;
    	let $finish;
    	let $finishFunc;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { full = false } = $$props;
    	let { fullContent = false } = $$props;
    	let { fullFooter = false } = $$props;
    	let { fullTitle = false } = $$props;
    	let { width = "min(720px, 100%)" } = $$props;
    	const level = getContext(levelContext) ?? 0;
    	const finish = getContext(closeContext) ?? writable(null);
    	component_subscribe($$self, finish, value => $$invalidate(17, $finish = value));
    	const parentWidth = getContext(widthContext) ?? "100%";
    	let stackComp = null;
    	const finishFunc = writable(null);
    	component_subscribe($$self, finishFunc, value => $$invalidate(18, $finishFunc = value));
    	setContext(levelContext, level + 1);
    	setContext(closeContext, finishFunc);
    	setContext(widthContext, width);
    	Math.random().toString();
    	let stackProps = {};

    	const openStack = (component, props = {}) => new Promise(resolve => {
    			set_store_value(
    				finishFunc,
    				$finishFunc = value => {
    					closeStack();
    					resolve(value);
    				},
    				$finishFunc
    			);

    			$$invalidate(4, stackComp = component);
    			$$invalidate(5, stackProps = props);
    		});

    	const closeStack = (value = null) => {
    		$finishFunc(value);
    	};

    	const close = value => {
    		if ($finish === null) {
    			return;
    		}

    		$finish(value);
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
    		finish,
    		finishFunc,
    		$$slots,
    		width,
    		openStack,
    		closeStack,
    		close,
    		$$scope,
    		slots
    	];
    }

    class Screen extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$v,
    			create_fragment$w,
    			safe_not_equal,
    			{
    				full: 0,
    				fullContent: 1,
    				fullFooter: 2,
    				fullTitle: 3,
    				width: 11,
    				openStack: 12,
    				closeStack: 13,
    				close: 14
    			},
    			add_css$4
    		);
    	}

    	get openStack() {
    		return this.$$.ctx[12];
    	}

    	get closeStack() {
    		return this.$$.ctx[13];
    	}

    	get close() {
    		return this.$$.ctx[14];
    	}
    }

    /* core\title-bar.svelte generated by Svelte v3.51.0 */

    function add_css$3(target) {
    	append_styles(target, "svelte-11cey84", "doric-title-bar.svelte-11cey84{position:relative;z-index:+0;grid-template-rows:48px min-content;background-color:var(--background-layer);display:grid}doric-title-bar.sticky.svelte-11cey84{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.compact.svelte-11cey84{grid-template-rows:32px min-content;box-shadow:none}title-area.svelte-11cey84{display:grid;grid-template-columns:max-content auto max-content}title-text.svelte-11cey84{font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}title-text.center.svelte-11cey84{justify-content:center}title-text.compact.svelte-11cey84{font-size:var(--text-size-header)}");
    }

    const get_extension_slot_changes = dirty => ({});
    const get_extension_slot_context = ctx => ({});
    const get_action_slot_changes = dirty => ({});
    const get_action_slot_context = ctx => ({});
    const get_menu_slot_changes = dirty => ({});
    const get_menu_slot_context = ctx => ({});

    // (51:26)               
    function fallback_block_1(ctx) {
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

    // (57:28)               
    function fallback_block(ctx) {
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

    function create_fragment$v(ctx) {
    	let doric_title_bar;
    	let title_area;
    	let t0;
    	let title_text;
    	let t1;
    	let t2;
    	let current;
    	const menu_slot_template = /*#slots*/ ctx[4].menu;
    	const menu_slot = create_slot(menu_slot_template, ctx, /*$$scope*/ ctx[3], get_menu_slot_context);
    	const menu_slot_or_fallback = menu_slot || fallback_block_1();
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	const action_slot_template = /*#slots*/ ctx[4].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[3], get_action_slot_context);
    	const action_slot_or_fallback = action_slot || fallback_block();
    	const extension_slot_template = /*#slots*/ ctx[4].extension;
    	const extension_slot = create_slot(extension_slot_template, ctx, /*$$scope*/ ctx[3], get_extension_slot_context);

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
    			set_custom_element_data(title_text, "class", "svelte-11cey84");
    			toggle_class(title_text, "center", /*center*/ ctx[1]);
    			toggle_class(title_text, "compact", /*compact*/ ctx[2]);
    			set_custom_element_data(title_area, "class", "svelte-11cey84");
    			set_custom_element_data(doric_title_bar, "class", "svelte-11cey84");
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
    		},
    		p(ctx, [dirty]) {
    			if (menu_slot) {
    				if (menu_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						menu_slot,
    						menu_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(menu_slot_template, /*$$scope*/ ctx[3], dirty, get_menu_slot_changes),
    						get_menu_slot_context
    					);
    				}
    			}

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

    			if (!current || dirty & /*center*/ 2) {
    				toggle_class(title_text, "center", /*center*/ ctx[1]);
    			}

    			if (!current || dirty & /*compact*/ 4) {
    				toggle_class(title_text, "compact", /*compact*/ ctx[2]);
    			}

    			if (action_slot) {
    				if (action_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						action_slot,
    						action_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(action_slot_template, /*$$scope*/ ctx[3], dirty, get_action_slot_changes),
    						get_action_slot_context
    					);
    				}
    			}

    			if (extension_slot) {
    				if (extension_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						extension_slot,
    						extension_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(extension_slot_template, /*$$scope*/ ctx[3], dirty, get_extension_slot_changes),
    						get_extension_slot_context
    					);
    				}
    			}

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
    		}
    	};
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { center } = $$props;
    	let { compact } = $$props;

    	$$self.$$set = $$props => {
    		if ('sticky' in $$props) $$invalidate(0, sticky = $$props.sticky);
    		if ('center' in $$props) $$invalidate(1, center = $$props.center);
    		if ('compact' in $$props) $$invalidate(2, compact = $$props.compact);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [sticky, center, compact, $$scope, slots];
    }

    class Title_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$u, create_fragment$v, safe_not_equal, { sticky: 0, center: 1, compact: 2 }, add_css$3);
    	}
    }

    /* core\tabs.svelte generated by Svelte v3.51.0 */

    function add_css$2(target) {
    	append_styles(target, "svelte-x5vfy4", "doric-tabs.svelte-x5vfy4.svelte-x5vfy4{display:grid;grid-template-columns:repeat(var(--tabs), 1fr);background-color:var(--card-background);color:var(--text-normal)}doric-tabs.vertical.svelte-x5vfy4.svelte-x5vfy4{grid-template-columns:1fr;grid-template-rows:repeat(var(--tabs), 1fr)}tab-item.svelte-x5vfy4.svelte-x5vfy4{display:grid;border-width:0px;border-bottom-width:2px;border-style:solid;border-color:transparent}tab-item.selected.svelte-x5vfy4.svelte-x5vfy4{color:var(--primary);border-color:var(--primary)}.vertical.svelte-x5vfy4 tab-item.svelte-x5vfy4{border-bottom-width:0px;border-right-width:2px}tab-label.svelte-x5vfy4.svelte-x5vfy4{display:flex;align-items:center;justify-content:center;padding:8px 12px;font-size:var(--text-sixe-header)}tab-label.vertical.svelte-x5vfy4.svelte-x5vfy4{flex-direction:column}");
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (64:20) {#if option.icon}
    function create_if_block$4(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: /*option*/ ctx[6].icon } });

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
    			if (dirty & /*options*/ 2) icon_changes.name = /*option*/ ctx[6].icon;
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

    // (62:12) <ActionArea on:tap={change(option.value)}>
    function create_default_slot$4(ctx) {
    	let tab_label;
    	let t0;
    	let span;
    	let t1_value = /*option*/ ctx[6].label + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[6].icon && create_if_block$4(ctx);

    	return {
    		c() {
    			tab_label = element("tab-label");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			set_custom_element_data(tab_label, "class", "svelte-x5vfy4");
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
    			if (/*option*/ ctx[6].icon) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*options*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
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

    			if ((!current || dirty & /*options*/ 2) && t1_value !== (t1_value = /*option*/ ctx[6].label + "")) set_data(t1, t1_value);

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

    // (60:4) {#each options as option (option.value)}
    function create_each_block$2(key_1, ctx) {
    	let tab_item;
    	let actionarea;
    	let t;
    	let current;

    	actionarea = new Action_area({
    			props: {
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			}
    		});

    	actionarea.$on("tap", function () {
    		if (is_function(/*change*/ ctx[5](/*option*/ ctx[6].value))) /*change*/ ctx[5](/*option*/ ctx[6].value).apply(this, arguments);
    	});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tab_item = element("tab-item");
    			create_component(actionarea.$$.fragment);
    			t = space();
    			set_custom_element_data(tab_item, "class", "svelte-x5vfy4");
    			toggle_class(tab_item, "selected", /*option*/ ctx[6].value === /*tabGroup*/ ctx[0]);
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

    			if (dirty & /*$$scope, iconTop, options*/ 522) {
    				actionarea_changes.$$scope = { dirty, ctx };
    			}

    			actionarea.$set(actionarea_changes);

    			if (!current || dirty & /*options, tabGroup*/ 3) {
    				toggle_class(tab_item, "selected", /*option*/ ctx[6].value === /*tabGroup*/ ctx[0]);
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

    function create_fragment$u(ctx) {
    	let doric_tabs;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[1];
    	const get_key = ctx => /*option*/ ctx[6].value;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	return {
    		c() {
    			doric_tabs = element("doric-tabs");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(doric_tabs, "ignore-titlebar-reskin", "");
    			set_custom_element_data(doric_tabs, "class", "svelte-x5vfy4");
    			toggle_class(doric_tabs, "vertical", /*vertical*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, doric_tabs, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(doric_tabs, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_tabs, /*tabCount*/ ctx[4]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*options, tabGroup, change, iconTop*/ 43) {
    				each_value = /*options*/ ctx[1];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, doric_tabs, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				check_outros();
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*tabCount*/ 16) vars_action.update.call(null, /*tabCount*/ ctx[4]);

    			if (!current || dirty & /*vertical*/ 4) {
    				toggle_class(doric_tabs, "vertical", /*vertical*/ ctx[2]);
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

    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let tabCount;
    	let { tabGroup } = $$props;
    	let { options } = $$props;
    	let { vertical } = $$props;
    	let { iconTop = false } = $$props;
    	const change = value => () => $$invalidate(0, tabGroup = value);

    	$$self.$$set = $$props => {
    		if ('tabGroup' in $$props) $$invalidate(0, tabGroup = $$props.tabGroup);
    		if ('options' in $$props) $$invalidate(1, options = $$props.options);
    		if ('vertical' in $$props) $$invalidate(2, vertical = $$props.vertical);
    		if ('iconTop' in $$props) $$invalidate(3, iconTop = $$props.iconTop);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 2) {
    			$$invalidate(4, tabCount = { tabs: options.length });
    		}
    	};

    	return [tabGroup, options, vertical, iconTop, tabCount, change];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$t,
    			create_fragment$u,
    			safe_not_equal,
    			{
    				tabGroup: 0,
    				options: 1,
    				vertical: 2,
    				iconTop: 3
    			},
    			add_css$2
    		);
    	}
    }

    /* core\layout\grid.svelte generated by Svelte v3.51.0 */

    function add_css$1(target) {
    	append_styles(target, "svelte-vhv3wa", "grid-layout.svelte-vhv3wa{display:grid;overflow:hidden;padding:var(--padding);gap:var(--gap);grid-auto-flow:var(--direction);grid-template-columns:var(--cols);grid-template-rows:var(--rows);grid-auto-columns:var(--autoCol);grid-auto-rows:var(--autoRow)}.scrollable.svelte-vhv3wa{overflow:auto;-webkit-overflow-scrolling:touch;height:100%;scroll-behavior:auto}");
    }

    function create_fragment$t(ctx) {
    	let grid_layout;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			grid_layout = element("grid-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(grid_layout, "class", "svelte-vhv3wa");
    			toggle_class(grid_layout, "scrollable", /*scrollable*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, grid_layout, anchor);

    			if (default_slot) {
    				default_slot.m(grid_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, grid_layout, /*flowVars*/ ctx[1]));
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

    			if (vars_action && is_function(vars_action.update) && dirty & /*flowVars*/ 2) vars_action.update.call(null, /*flowVars*/ ctx[1]);

    			if (!current || dirty & /*scrollable*/ 1) {
    				toggle_class(grid_layout, "scrollable", /*scrollable*/ ctx[0]);
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
    			dispose();
    		}
    	};
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let flowVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { autoCol = null } = $$props;
    	let { autoRow = null } = $$props;
    	let { cols = null } = $$props;
    	let { direction = "row" } = $$props;
    	let { gap = "4px" } = $$props;
    	let { padding = "4px" } = $$props;
    	let { rows = null } = $$props;
    	let { scrollable = false } = $$props;

    	$$self.$$set = $$props => {
    		if ('autoCol' in $$props) $$invalidate(2, autoCol = $$props.autoCol);
    		if ('autoRow' in $$props) $$invalidate(3, autoRow = $$props.autoRow);
    		if ('cols' in $$props) $$invalidate(4, cols = $$props.cols);
    		if ('direction' in $$props) $$invalidate(5, direction = $$props.direction);
    		if ('gap' in $$props) $$invalidate(6, gap = $$props.gap);
    		if ('padding' in $$props) $$invalidate(7, padding = $$props.padding);
    		if ('rows' in $$props) $$invalidate(8, rows = $$props.rows);
    		if ('scrollable' in $$props) $$invalidate(0, scrollable = $$props.scrollable);
    		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction, padding, gap, cols, rows, autoCol, autoRow*/ 508) {
    			$$invalidate(1, flowVars = {
    				direction,
    				padding,
    				gap,
    				cols,
    				rows,
    				autoCol,
    				autoRow
    			});
    		}
    	};

    	return [
    		scrollable,
    		flowVars,
    		autoCol,
    		autoRow,
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
    			instance$s,
    			create_fragment$t,
    			safe_not_equal,
    			{
    				autoCol: 2,
    				autoRow: 3,
    				cols: 4,
    				direction: 5,
    				gap: 6,
    				padding: 7,
    				rows: 8,
    				scrollable: 0
    			},
    			add_css$1
    		);
    	}
    }

    /* core\theme\light.svelte generated by Svelte v3.51.0 */

    function create_fragment$s(ctx) {
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

    function instance$r($$self) {
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
    		init(this, options, instance$r, create_fragment$s, safe_not_equal, {});
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.51.0 */

    function create_fragment$r(ctx) {
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

    function instance$q($$self) {
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
    		init(this, options, instance$q, create_fragment$r, safe_not_equal, {});
    	}
    }

    /* core\theme\tron.svelte generated by Svelte v3.51.0 */

    function create_fragment$q(ctx) {
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

    function instance$p($$self) {
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
    		init(this, options, instance$p, create_fragment$q, safe_not_equal, {});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var store = {};

    var internal = {};

    (function (exports) {

    Object.defineProperty(exports, '__esModule', { value: true });

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function not_equal(a, b) {
        return a != a ? b == b : a !== b;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
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
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn);
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
    function once(fn) {
        let ran = false;
        return function (...args) {
            if (ran)
                return;
            ran = true;
            fn.call(this, ...args);
        };
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    const has_prop = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    exports.now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    exports.raf = is_client ? cb => requestAnimationFrame(cb) : noop;
    // used internally for testing
    function set_now(fn) {
        exports.now = fn;
    }
    function set_raf(fn) {
        exports.raf = fn;
    }

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            exports.raf(run_tasks);
    }
    /**
     * For testing purposes only!
     */
    function clear_loops() {
        tasks.clear();
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            exports.raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>
        let children = target.childNodes;
        // If target is <head>, there may be children without claim_order
        if (target.nodeName === 'HEAD') {
            const myChildren = [];
            for (let i = 0; i < children.length; i++) {
                const node = children[i];
                if (node.claim_order !== undefined) {
                    myChildren.push(node);
                }
            }
            children = myChildren;
        }
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            // with fast path for when we are on the current longest subsequence
            const seqLen = ((longest > 0 && children[m[longest]].claim_order <= current) ? longest + 1 : upper_bound(1, longest, idx => children[m[idx]].claim_order, current)) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
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
    function append_hydration(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentNode !== target))) {
                target.actual_end_child = target.firstChild;
            }
            // Skip nodes of undefined ordering
            while ((target.actual_end_child !== null) && (target.actual_end_child.claim_order === undefined)) {
                target.actual_end_child = target.actual_end_child.nextSibling;
            }
            if (node !== target.actual_end_child) {
                // We only insert if the ordering of this node should be modified or the parent node is not target
                if (node.claim_order !== undefined || node.parentNode !== target) {
                    target.insertBefore(node, target.actual_end_child);
                }
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target || node.nextSibling !== null) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function insert_hydration(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append_hydration(target, node);
        }
        else if (node.parentNode !== target || node.nextSibling != anchor) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function element_is(name, is) {
        return document.createElement(name, { is });
    }
    function object_without_properties(obj, exclude) {
        const target = {};
        for (const k in obj) {
            if (has_prop(obj, k)
                // @ts-ignore
                && exclude.indexOf(k) === -1) {
                // @ts-ignore
                target[k] = obj[k];
            }
        }
        return target;
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function self(fn) {
        return function (event) {
            // @ts-ignore
            if (event.target === this)
                fn.call(this, event);
        };
    }
    function trusted(fn) {
        return function (event) {
            // @ts-ignore
            if (event.isTrusted)
                fn.call(this, event);
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
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function set_custom_element_data_map(node, data_map) {
        Object.keys(data_map).forEach((key) => {
            set_custom_element_data(node, key, data_map[key]);
        });
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function xlink_attr(node, attribute, value) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
    }
    function get_binding_group_value(group, __value, checked) {
        const value = new Set();
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.add(group[i].__value);
        }
        if (!checked) {
            value.delete(__value);
        }
        return Array.from(value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function time_ranges_to_array(ranges) {
        const array = [];
        for (let i = 0; i < ranges.length; i += 1) {
            array.push({ start: ranges.start(i), end: ranges.end(i) });
        }
        return array;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function init_claim_info(nodes) {
        if (nodes.claim_info === undefined) {
            nodes.claim_info = { last_index: 0, total_claimed: 0 };
        }
    }
    function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
        // Try to find nodes in an order such that we lengthen the longest increasing subsequence
        init_claim_info(nodes);
        const resultNode = (() => {
            // We first try to find an element after the previous one
            for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    return node;
                }
            }
            // Otherwise, we try to find one before
            // We iterate in reverse so that we don't go too far back
            for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    else if (replacement === undefined) {
                        // Since we spliced before the last_index, we decrease it
                        nodes.claim_info.last_index--;
                    }
                    return node;
                }
            }
            // If we can't find any matching node, we create a new one
            return createNode();
        })();
        resultNode.claim_order = nodes.claim_info.total_claimed;
        nodes.claim_info.total_claimed += 1;
        return resultNode;
    }
    function claim_element_base(nodes, name, attributes, create_element) {
        return claim_node(nodes, (node) => node.nodeName === name, (node) => {
            const remove = [];
            for (let j = 0; j < node.attributes.length; j++) {
                const attribute = node.attributes[j];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            remove.forEach(v => node.removeAttribute(v));
            return undefined;
        }, () => create_element(name));
    }
    function claim_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, element);
    }
    function claim_svg_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, svg_element);
    }
    function claim_text(nodes, data) {
        return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
            const dataStr = '' + data;
            if (node.data.startsWith(dataStr)) {
                if (node.data.length !== dataStr.length) {
                    return node.splitText(dataStr.length);
                }
            }
            else {
                node.data = dataStr;
            }
        }, () => text(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
        );
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function find_comment(nodes, text, start) {
        for (let i = start; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 8 /* comment node */ && node.textContent.trim() === text) {
                return i;
            }
        }
        return nodes.length;
    }
    function claim_html_tag(nodes, is_svg) {
        // find html opening tag
        const start_index = find_comment(nodes, 'HTML_TAG_START', 0);
        const end_index = find_comment(nodes, 'HTML_TAG_END', start_index);
        if (start_index === end_index) {
            return new HtmlTagHydration(undefined, is_svg);
        }
        init_claim_info(nodes);
        const html_tag_nodes = nodes.splice(start_index, end_index - start_index + 1);
        detach(html_tag_nodes[0]);
        detach(html_tag_nodes[html_tag_nodes.length - 1]);
        const claimed_nodes = html_tag_nodes.slice(1, html_tag_nodes.length - 1);
        for (const n of claimed_nodes) {
            n.claim_order = nodes.claim_info.total_claimed;
            nodes.claim_info.total_claimed += 1;
        }
        return new HtmlTagHydration(claimed_nodes, is_svg);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_input_type(input, type) {
        try {
            input.type = type;
        }
        catch (e) {
            // do nothing
        }
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_options(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            option.selected = ~value.indexOf(option.__value);
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function select_multiple_value(select) {
        return [].map.call(select.querySelectorAll(':checked'), option => option.__value);
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    function query_selector_all(selector, parent = document.body) {
        return Array.from(parent.querySelectorAll(selector));
    }
    function head_selector(nodeId, head) {
        const result = [];
        let started = 0;
        for (const node of head.childNodes) {
            if (node.nodeType === 8 /* comment node */) {
                const comment = node.textContent.trim();
                if (comment === `HEAD_${nodeId}_END`) {
                    started -= 1;
                    result.push(node);
                }
                else if (comment === `HEAD_${nodeId}_START`) {
                    started += 1;
                    result.push(node);
                }
            }
            else if (started > 0) {
                result.push(node);
            }
        }
        return result;
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
    class HtmlTagHydration extends HtmlTag {
        constructor(claimed_nodes, is_svg = false) {
            super(is_svg);
            this.e = this.n = null;
            this.l = claimed_nodes;
        }
        c(html) {
            if (this.l) {
                this.n = this.l;
            }
            else {
                super.c(html);
            }
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert_hydration(this.t, this.n[i], anchor);
            }
        }
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }
    function get_custom_elements_slots(element) {
        const result = {};
        element.childNodes.forEach((node) => {
            result[node.slot || 'default'] = true;
        });
        return result;
    }
    function construct_svelte_component(component, props) {
        return new component(props);
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
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
        const name = `__svelte_${hash(rule)}_${uid}`;
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
        exports.raf(() => {
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

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = exports.now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    function set_current_component(component) {
        exports.current_component = component;
    }
    function get_current_component() {
        if (!exports.current_component)
            throw new Error('Function called outside component initialization');
        return exports.current_component;
    }
    /**
     * Schedules a callback to run immediately before the component is updated after any state change.
     *
     * The first time the callback runs will be before the initial `onMount`
     *
     * https://svelte.dev/docs#run-time-svelte-beforeupdate
     */
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
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
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    /**
     * Retrieves the whole context map that belongs to the closest parent component.
     * Must be called during component initialisation. Useful, for example, if you
     * programmatically create a component and want to pass the existing context to it.
     *
     * https://svelte.dev/docs#run-time-svelte-getallcontexts
     */
    function getAllContexts() {
        return get_current_component().$$.context;
    }
    /**
     * Checks whether a given `key` has been set in the context of a parent component.
     * Must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-hascontext
     */
    function hasContext(key) {
        return get_current_component().$$.context.has(key);
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
    const intros = { enabled: false };
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
    function tick() {
        schedule_update();
        return resolved_promise;
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
        const saved_component = exports.current_component;
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
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = exports.now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = exports.now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
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
                start: exports.now() + delay,
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
                        config = config();
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

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : commonjsGlobal);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_destroy_block(block, lookup) {
        block.f();
        destroy_block(block, lookup);
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
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
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
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

    // source: https://html.spec.whatwg.org/multipage/indices.html
    const boolean_attributes = new Set([
        'allowfullscreen',
        'allowpaymentrequest',
        'async',
        'autofocus',
        'autoplay',
        'checked',
        'controls',
        'default',
        'defer',
        'disabled',
        'formnovalidate',
        'hidden',
        'inert',
        'ismap',
        'itemscope',
        'loop',
        'multiple',
        'muted',
        'nomodule',
        'novalidate',
        'open',
        'playsinline',
        'readonly',
        'required',
        'reversed',
        'selected'
    ]);

    /** regex of all html void element names */
    const void_element_names = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;
    function is_void(name) {
        return void_element_names.test(name) || name.toLowerCase() === '!doctype';
    }

    const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
    // https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
    // https://infra.spec.whatwg.org/#noncharacter
    function spread(args, attrs_to_add) {
        const attributes = Object.assign({}, ...args);
        if (attrs_to_add) {
            const classes_to_add = attrs_to_add.classes;
            const styles_to_add = attrs_to_add.styles;
            if (classes_to_add) {
                if (attributes.class == null) {
                    attributes.class = classes_to_add;
                }
                else {
                    attributes.class += ' ' + classes_to_add;
                }
            }
            if (styles_to_add) {
                if (attributes.style == null) {
                    attributes.style = style_object_to_string(styles_to_add);
                }
                else {
                    attributes.style = style_object_to_string(merge_ssr_styles(attributes.style, styles_to_add));
                }
            }
        }
        let str = '';
        Object.keys(attributes).forEach(name => {
            if (invalid_attribute_name_character.test(name))
                return;
            const value = attributes[name];
            if (value === true)
                str += ' ' + name;
            else if (boolean_attributes.has(name.toLowerCase())) {
                if (value)
                    str += ' ' + name;
            }
            else if (value != null) {
                str += ` ${name}="${value}"`;
            }
        });
        return str;
    }
    function merge_ssr_styles(style_attribute, style_directive) {
        const style_object = {};
        for (const individual_style of style_attribute.split(';')) {
            const colon_index = individual_style.indexOf(':');
            const name = individual_style.slice(0, colon_index).trim();
            const value = individual_style.slice(colon_index + 1).trim();
            if (!name)
                continue;
            style_object[name] = value;
        }
        for (const name in style_directive) {
            const value = style_directive[name];
            if (value) {
                style_object[name] = value;
            }
            else {
                delete style_object[name];
            }
        }
        return style_object;
    }
    const ATTR_REGEX = /[&"]/g;
    const CONTENT_REGEX = /[&<]/g;
    /**
     * Note: this method is performance sensitive and has been optimized
     * https://github.com/sveltejs/svelte/pull/5701
     */
    function escape(value, is_attr = false) {
        const str = String(value);
        const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
        pattern.lastIndex = 0;
        let escaped = '';
        let last = 0;
        while (pattern.test(str)) {
            const i = pattern.lastIndex - 1;
            const ch = str[i];
            escaped += str.substring(last, i) + (ch === '&' ? '&amp;' : (ch === '"' ? '&quot;' : '&lt;'));
            last = i + 1;
        }
        return escaped + str.substring(last);
    }
    function escape_attribute_value(value) {
        // keep booleans, null, and undefined for the sake of `spread`
        const should_escape = typeof value === 'string' || (value && typeof value === 'object');
        return should_escape ? escape(value, true) : value;
    }
    function escape_object(obj) {
        const result = {};
        for (const key in obj) {
            result[key] = escape_attribute_value(obj[key]);
        }
        return result;
    }
    function each(items, fn) {
        let str = '';
        for (let i = 0; i < items.length; i += 1) {
            str += fn(items[i], i);
        }
        return str;
    }
    const missing_component = {
        $$render: () => ''
    };
    function validate_component(component, name) {
        if (!component || !component.$$render) {
            if (name === 'svelte:component')
                name += ' this={...}';
            throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules. Otherwise you may need to fix a <${name}>.`);
        }
        return component;
    }
    function debug(file, line, column, values) {
        console.log(`{@debug} ${file ? file + ' ' : ''}(${line}:${column})`); // eslint-disable-line no-console
        console.log(values); // eslint-disable-line no-console
        return '';
    }
    let on_destroy;
    function create_ssr_component(fn) {
        function $$render(result, props, bindings, slots, context) {
            const parent_component = exports.current_component;
            const $$ = {
                on_destroy,
                context: new Map(context || (parent_component ? parent_component.$$.context : [])),
                // these will be immediately discarded
                on_mount: [],
                before_update: [],
                after_update: [],
                callbacks: blank_object()
            };
            set_current_component({ $$ });
            const html = fn(result, props, bindings, slots);
            set_current_component(parent_component);
            return html;
        }
        return {
            render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
                on_destroy = [];
                const result = { title: '', head: '', css: new Set() };
                const html = $$render(result, props, {}, $$slots, context);
                run_all(on_destroy);
                return {
                    html,
                    css: {
                        code: Array.from(result.css).map(css => css.code).join('\n'),
                        map: null // TODO
                    },
                    head: result.title + result.head
                };
            },
            $$render
        };
    }
    function add_attribute(name, value, boolean) {
        if (value == null || (boolean && !value))
            return '';
        const assignment = (boolean && value === true) ? '' : `="${escape(value, true)}"`;
        return ` ${name}${assignment}`;
    }
    function add_classes(classes) {
        return classes ? ` class="${classes}"` : '';
    }
    function style_object_to_string(style_object) {
        return Object.keys(style_object)
            .filter(key => style_object[key])
            .map(key => `${key}: ${style_object[key]};`)
            .join(' ');
    }
    function add_styles(style_object) {
        const styles = style_object_to_string(style_object);
        return styles ? ` style="${styles}"` : '';
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
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
        const parent_component = exports.current_component;
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
                start_hydrating();
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
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    if (typeof HTMLElement === 'function') {
        exports.SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
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
        };
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.51.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function append_hydration_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append_hydration(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function insert_hydration_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert_hydration(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function detach_between_dev(before, after) {
        while (before.nextSibling && before.nextSibling !== after) {
            detach_dev(before.nextSibling);
        }
    }
    function detach_before_dev(after) {
        while (after.previousSibling) {
            detach_dev(after.previousSibling);
        }
    }
    function detach_after_dev(before) {
        while (before.nextSibling) {
            detach_dev(before.nextSibling);
        }
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function dataset_dev(node, property, value) {
        node.dataset[property] = value;
        dispatch_dev('SvelteDOMSetDataset', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function validate_dynamic_element(tag) {
        const is_string = typeof tag === 'string';
        if (tag && !is_string) {
            throw new Error('<svelte:element> expects "this" attribute to be a string.');
        }
    }
    function validate_void_dynamic_element(tag) {
        if (tag && is_void(tag)) {
            console.warn(`<svelte:element this="${tag}"> is self-closing and cannot have content.`);
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }
    /**
     * Base class to create strongly typed Svelte components.
     * This only exists for typing purposes and should be used in `.d.ts` files.
     *
     * ### Example:
     *
     * You have component library on npm called `component-library`, from which
     * you export a component called `MyComponent`. For Svelte+TypeScript users,
     * you want to provide typings. Therefore you create a `index.d.ts`:
     * ```ts
     * import { SvelteComponentTyped } from "svelte";
     * export class MyComponent extends SvelteComponentTyped<{foo: string}> {}
     * ```
     * Typing this makes it possible for IDEs like VS Code with the Svelte extension
     * to provide intellisense and to use the component like this in a Svelte file
     * with TypeScript:
     * ```svelte
     * <script lang="ts">
     * 	import { MyComponent } from "component-library";
     * </script>
     * <MyComponent foo={'bar'} />
     * ```
     *
     * #### Why not make this part of `SvelteComponent(Dev)`?
     * Because
     * ```ts
     * class ASubclassOfSvelteComponent extends SvelteComponent<{foo: string}> {}
     * const component: typeof SvelteComponent = ASubclassOfSvelteComponent;
     * ```
     * will throw a type error, so we need to separate the more strictly typed class.
     */
    class SvelteComponentTyped extends SvelteComponentDev {
        constructor(options) {
            super(options);
        }
    }
    function loop_guard(timeout) {
        const start = Date.now();
        return () => {
            if (Date.now() - start > timeout) {
                throw new Error('Infinite loop detected');
            }
        };
    }

    exports.HtmlTag = HtmlTag;
    exports.HtmlTagHydration = HtmlTagHydration;
    exports.SvelteComponent = SvelteComponent;
    exports.SvelteComponentDev = SvelteComponentDev;
    exports.SvelteComponentTyped = SvelteComponentTyped;
    exports.action_destroyer = action_destroyer;
    exports.add_attribute = add_attribute;
    exports.add_classes = add_classes;
    exports.add_flush_callback = add_flush_callback;
    exports.add_location = add_location;
    exports.add_render_callback = add_render_callback;
    exports.add_resize_listener = add_resize_listener;
    exports.add_styles = add_styles;
    exports.add_transform = add_transform;
    exports.afterUpdate = afterUpdate;
    exports.append = append;
    exports.append_dev = append_dev;
    exports.append_empty_stylesheet = append_empty_stylesheet;
    exports.append_hydration = append_hydration;
    exports.append_hydration_dev = append_hydration_dev;
    exports.append_styles = append_styles;
    exports.assign = assign;
    exports.attr = attr;
    exports.attr_dev = attr_dev;
    exports.attribute_to_object = attribute_to_object;
    exports.beforeUpdate = beforeUpdate;
    exports.bind = bind;
    exports.binding_callbacks = binding_callbacks;
    exports.blank_object = blank_object;
    exports.bubble = bubble;
    exports.check_outros = check_outros;
    exports.children = children;
    exports.claim_component = claim_component;
    exports.claim_element = claim_element;
    exports.claim_html_tag = claim_html_tag;
    exports.claim_space = claim_space;
    exports.claim_svg_element = claim_svg_element;
    exports.claim_text = claim_text;
    exports.clear_loops = clear_loops;
    exports.component_subscribe = component_subscribe;
    exports.compute_rest_props = compute_rest_props;
    exports.compute_slots = compute_slots;
    exports.construct_svelte_component = construct_svelte_component;
    exports.construct_svelte_component_dev = construct_svelte_component_dev;
    exports.createEventDispatcher = createEventDispatcher;
    exports.create_animation = create_animation;
    exports.create_bidirectional_transition = create_bidirectional_transition;
    exports.create_component = create_component;
    exports.create_in_transition = create_in_transition;
    exports.create_out_transition = create_out_transition;
    exports.create_slot = create_slot;
    exports.create_ssr_component = create_ssr_component;
    exports.custom_event = custom_event;
    exports.dataset_dev = dataset_dev;
    exports.debug = debug;
    exports.destroy_block = destroy_block;
    exports.destroy_component = destroy_component;
    exports.destroy_each = destroy_each;
    exports.detach = detach;
    exports.detach_after_dev = detach_after_dev;
    exports.detach_before_dev = detach_before_dev;
    exports.detach_between_dev = detach_between_dev;
    exports.detach_dev = detach_dev;
    exports.dirty_components = dirty_components;
    exports.dispatch_dev = dispatch_dev;
    exports.each = each;
    exports.element = element;
    exports.element_is = element_is;
    exports.empty = empty;
    exports.end_hydrating = end_hydrating;
    exports.escape = escape;
    exports.escape_attribute_value = escape_attribute_value;
    exports.escape_object = escape_object;
    exports.exclude_internal_props = exclude_internal_props;
    exports.fix_and_destroy_block = fix_and_destroy_block;
    exports.fix_and_outro_and_destroy_block = fix_and_outro_and_destroy_block;
    exports.fix_position = fix_position;
    exports.flush = flush;
    exports.getAllContexts = getAllContexts;
    exports.getContext = getContext;
    exports.get_all_dirty_from_scope = get_all_dirty_from_scope;
    exports.get_binding_group_value = get_binding_group_value;
    exports.get_current_component = get_current_component;
    exports.get_custom_elements_slots = get_custom_elements_slots;
    exports.get_root_for_style = get_root_for_style;
    exports.get_slot_changes = get_slot_changes;
    exports.get_spread_object = get_spread_object;
    exports.get_spread_update = get_spread_update;
    exports.get_store_value = get_store_value;
    exports.globals = globals;
    exports.group_outros = group_outros;
    exports.handle_promise = handle_promise;
    exports.hasContext = hasContext;
    exports.has_prop = has_prop;
    exports.head_selector = head_selector;
    exports.identity = identity;
    exports.init = init;
    exports.insert = insert;
    exports.insert_dev = insert_dev;
    exports.insert_hydration = insert_hydration;
    exports.insert_hydration_dev = insert_hydration_dev;
    exports.intros = intros;
    exports.invalid_attribute_name_character = invalid_attribute_name_character;
    exports.is_client = is_client;
    exports.is_crossorigin = is_crossorigin;
    exports.is_empty = is_empty;
    exports.is_function = is_function;
    exports.is_promise = is_promise;
    exports.is_void = is_void;
    exports.listen = listen;
    exports.listen_dev = listen_dev;
    exports.loop = loop;
    exports.loop_guard = loop_guard;
    exports.merge_ssr_styles = merge_ssr_styles;
    exports.missing_component = missing_component;
    exports.mount_component = mount_component;
    exports.noop = noop;
    exports.not_equal = not_equal;
    exports.null_to_empty = null_to_empty;
    exports.object_without_properties = object_without_properties;
    exports.onDestroy = onDestroy;
    exports.onMount = onMount;
    exports.once = once;
    exports.outro_and_destroy_block = outro_and_destroy_block;
    exports.prevent_default = prevent_default;
    exports.prop_dev = prop_dev;
    exports.query_selector_all = query_selector_all;
    exports.run = run;
    exports.run_all = run_all;
    exports.safe_not_equal = safe_not_equal;
    exports.schedule_update = schedule_update;
    exports.select_multiple_value = select_multiple_value;
    exports.select_option = select_option;
    exports.select_options = select_options;
    exports.select_value = select_value;
    exports.self = self;
    exports.setContext = setContext;
    exports.set_attributes = set_attributes;
    exports.set_current_component = set_current_component;
    exports.set_custom_element_data = set_custom_element_data;
    exports.set_custom_element_data_map = set_custom_element_data_map;
    exports.set_data = set_data;
    exports.set_data_dev = set_data_dev;
    exports.set_input_type = set_input_type;
    exports.set_input_value = set_input_value;
    exports.set_now = set_now;
    exports.set_raf = set_raf;
    exports.set_store_value = set_store_value;
    exports.set_style = set_style;
    exports.set_svg_attributes = set_svg_attributes;
    exports.space = space;
    exports.spread = spread;
    exports.src_url_equal = src_url_equal;
    exports.start_hydrating = start_hydrating;
    exports.stop_propagation = stop_propagation;
    exports.subscribe = subscribe;
    exports.svg_element = svg_element;
    exports.text = text;
    exports.tick = tick;
    exports.time_ranges_to_array = time_ranges_to_array;
    exports.to_number = to_number;
    exports.toggle_class = toggle_class;
    exports.transition_in = transition_in;
    exports.transition_out = transition_out;
    exports.trusted = trusted;
    exports.update_await_block_branch = update_await_block_branch;
    exports.update_keyed_each = update_keyed_each;
    exports.update_slot = update_slot;
    exports.update_slot_base = update_slot_base;
    exports.validate_component = validate_component;
    exports.validate_dynamic_element = validate_dynamic_element;
    exports.validate_each_argument = validate_each_argument;
    exports.validate_each_keys = validate_each_keys;
    exports.validate_slots = validate_slots;
    exports.validate_store = validate_store;
    exports.validate_void_dynamic_element = validate_void_dynamic_element;
    exports.xlink_attr = xlink_attr;
    }(internal));

    (function (exports) {

    Object.defineProperty(exports, '__esModule', { value: true });

    var internal$1 = internal;

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
    function writable(value, start = internal$1.noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (internal$1.safe_not_equal(value, new_value)) {
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
        function subscribe(run, invalidate = internal$1.noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || internal$1.noop;
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
            let cleanup = internal$1.noop;
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
                    cleanup = internal$1.is_function(result) ? result : internal$1.noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => internal$1.subscribe(store, (value) => {
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
                internal$1.run_all(unsubscribers);
                cleanup();
            };
        });
    }

    Object.defineProperty(exports, 'get', {
    	enumerable: true,
    	get: function () {
    		return internal$1.get_store_value;
    	}
    });
    exports.derived = derived;
    exports.readable = readable;
    exports.writable = writable;
    }(store));

    const {readable} = store;

    const readHash = () => {
        if (typeof document !== "undefined") {
            return document.location.hash.toString().slice(1)
        }
        return ""
    };
    readable(
        readHash(),
        set => {
            const scanner = setInterval(
                () => set(readHash()),
                20
            );
            return () => clearInterval(scanner)
        }
    );

    const drawer = {
        open: openDrawer,
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

    /* node_modules\svelte-markdown\src\Parser.svelte generated by Svelte v3.51.0 */

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

    function get_each_context_1$1(ctx, list, i) {
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

    function get_each_context$1(ctx, list, i) {
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
    function create_if_block$3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*tokens*/ ctx[1];
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
    			if (dirty & /*tokens, renderers*/ 34) {
    				each_value = /*tokens*/ ctx[1];
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
    	const if_block_creators = [create_if_block_4$1, create_else_block$3];
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
    				$$slots: { default: [create_default_slot$3] },
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
    function create_else_block$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ ordered: /*ordered*/ ctx[4] }, /*$$restProps*/ ctx[6]];
    	var switch_value = /*renderers*/ ctx[5].list;

    	function switch_props(ctx) {
    		let switch_instance_props = {
    			$$slots: { default: [create_default_slot_9$1] },
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
    			$$slots: { default: [create_default_slot_7$1] },
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
    function create_default_slot_10(ctx) {
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
    			$$slots: { default: [create_default_slot_10] },
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
    function create_default_slot_9$1(ctx) {
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
    function create_default_slot_8$1(ctx) {
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
    			$$slots: { default: [create_default_slot_8$1] },
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
    function create_default_slot_7$1(ctx) {
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
    function create_default_slot_6$1(ctx) {
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
    				$$slots: { default: [create_default_slot_6$1] },
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
    function create_default_slot_5$1(ctx) {
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
    function create_default_slot_4$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablerow;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_5$1] },
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
    function create_default_slot_3$2(ctx) {
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
    				$$slots: { default: [create_default_slot_3$2] },
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
    function create_default_slot_2$2(ctx) {
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
    function create_each_block_1$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablerow;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_2$2] },
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
    function create_default_slot_1$3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*rows*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
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
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
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
    function create_default_slot$3(ctx) {
    	let switch_instance0;
    	let t;
    	let switch_instance1;
    	let switch_instance1_anchor;
    	let current;
    	var switch_value = /*renderers*/ ctx[5].tablehead;

    	function switch_props(ctx) {
    		return {
    			props: {
    				$$slots: { default: [create_default_slot_4$2] },
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
    				$$slots: { default: [create_default_slot_1$3] },
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
    function create_each_block$1(ctx) {
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

    function create_fragment$p(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_if_block_1$1];
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

    function instance$o($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$o, create_fragment$p, safe_not_equal, {
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
    const escapeReplace = /[&<>"']/g;
    const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
    const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
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
            lang: cap[2] ? cap[2].trim() : cap[2],
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

          return {
            type: 'blockquote',
            raw: cap[0],
            tokens: this.lexer.blockTokens(text, []),
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

            line = cap[2].split('\n', 1)[0];
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
              const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?: [^\\n]*)?(?:\\n|$))`);
              const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
              const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
              const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);

              // Check if following lines should be included in List Item
              while (src) {
                rawLine = src.split('\n', 1)[0];
                line = rawLine;

                // Re-align to follow commonmark nesting rules
                if (this.options.pedantic) {
                  line = line.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
                }

                // End list item if found code fences
                if (fencesBeginRegex.test(line)) {
                  break;
                }

                // End list item if found start of new heading
                if (headingBeginRegex.test(line)) {
                  break;
                }

                // End list item if found start of new bullet
                if (nextBulletRegex.test(line)) {
                  break;
                }

                // Horizontal rule found
                if (hrRegex.test(src)) {
                  break;
                }

                if (line.search(/[^ ]/) >= indent || !line.trim()) { // Dedent if possible
                  itemContents += '\n' + line.slice(indent);
                } else if (!blankLine) { // Until blank line, item doesn't need indentation
                  itemContents += '\n' + line;
                } else { // Otherwise, improper indentation ends this item
                  break;
                }

                if (!blankLine && !line.trim()) { // Check if current line is blank
                  blankLine = true;
                }

                raw += rawLine + '\n';
                src = src.substring(rawLine.length + 1);
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
            const spacers = list.items[i].tokens.filter(t => t.type === 'space');
            const hasMultipleLineBreaks = spacers.every(t => {
              const chars = t.raw.split('');
              let lineBreaks = 0;
              for (const char of chars) {
                if (char === '\n') {
                  lineBreaks += 1;
                }
                if (lineBreaks > 1) {
                  return true;
                }
              }

              return false;
            });

            if (!list.loose && spacers.length && hasMultipleLineBreaks) {
              // Having a single line break doesn't mean a list is loose. A single line break is terminating the last list item
              list.loose = true;
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
          if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
          const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
          return {
            type: 'def',
            tag,
            raw: cap[0],
            href: cap[2],
            title: cap[3]
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
          if (!link || !link.href) {
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

            // Create `em` if smallest delimiter has odd char count. *a***
            if (Math.min(lLength, rLength) % 2) {
              const text = src.slice(1, lLength + match.index + rLength);
              return {
                type: 'em',
                raw: src.slice(0, lLength + match.index + rLength + 1),
                text,
                tokens: this.lexer.inlineTokens(text)
              };
            }

            // Create 'strong' if smallest delimiter has even char count. **a***
            const text = src.slice(2, lLength + match.index + rLength - 1);
            return {
              type: 'strong',
              raw: src.slice(0, lLength + match.index + rLength + 1),
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
              href = 'http://' + text;
            } else {
              href = text;
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
      def: /^ {0,3}\[(label)\]: *(?:\n *)?<?([^\s>]+)>?(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
      table: noopTest,
      lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
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
        //          () Skip orphan inside strong  () Consume to delim (1) #***                (2) a***#, a***                   (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
        rDelimAst: /^[^_*]*?\_\_[^_*]*?\*[^_*]*?(?=\_\_)|[^*]+(?=[^*])|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,
        rDelimUnd: /^[^_*]*?\*\*[^_*]*?\_[^_*]*?(?=\*\*)|[^_]+(?=[^_])|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/ // ^- Not allowed for _
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
    inline.escapedEmSt = /\\\*|\\_/g;

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
      _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
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
          maskedSrc = maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
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
          + escape(lang, true)
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
        let out = '<a href="' + escape(href) + '"';
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
      const opts = merge({}, ...args);
      const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };
      let hasExtensions;

      args.forEach((pack) => {
        // ==-- Parse "addon" extensions --== //
        if (pack.extensions) {
          hasExtensions = true;
          pack.extensions.forEach((ext) => {
            if (!ext.name) {
              throw new Error('extension name required');
            }
            if (ext.renderer) { // Renderer extensions
              const prevRenderer = extensions.renderers ? extensions.renderers[ext.name] : null;
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

        if (hasExtensions) {
          opts.extensions = extensions;
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

    /* node_modules\svelte-markdown\src\renderers\Heading.svelte generated by Svelte v3.51.0 */

    function create_else_block$2(ctx) {
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
    function create_if_block$2(ctx) {
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

    function create_fragment$o(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	const if_block_creators = [
    		create_if_block$2,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4,
    		create_if_block_5,
    		create_else_block$2
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

    function instance$n($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$n, create_fragment$o, safe_not_equal, { depth: 0, raw: 1, text: 3 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Paragraph.svelte generated by Svelte v3.51.0 */

    function create_fragment$n(ctx) {
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

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Paragraph extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$m, create_fragment$n, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Text.svelte generated by Svelte v3.51.0 */

    function create_fragment$m(ctx) {
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

    function instance$l($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$l, create_fragment$m, safe_not_equal, { text: 0, raw: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Image.svelte generated by Svelte v3.51.0 */

    function create_fragment$l(ctx) {
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

    function instance$k($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$k, create_fragment$l, safe_not_equal, { href: 0, title: 1, text: 2 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Link.svelte generated by Svelte v3.51.0 */

    function create_fragment$k(ctx) {
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

    function instance$j($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$j, create_fragment$k, safe_not_equal, { href: 0, title: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Em.svelte generated by Svelte v3.51.0 */

    function create_fragment$j(ctx) {
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

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Em extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$i, create_fragment$j, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Del.svelte generated by Svelte v3.51.0 */

    function create_fragment$i(ctx) {
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

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Del extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$i, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Codespan.svelte generated by Svelte v3.51.0 */

    function create_fragment$h(ctx) {
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

    function instance$g($$self, $$props, $$invalidate) {
    	let { raw } = $$props;

    	$$self.$$set = $$props => {
    		if ('raw' in $$props) $$invalidate(0, raw = $$props.raw);
    	};

    	return [raw];
    }

    class Codespan extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$g, create_fragment$h, safe_not_equal, { raw: 0 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Strong.svelte generated by Svelte v3.51.0 */

    function create_fragment$g(ctx) {
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

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Strong extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$f, create_fragment$g, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Table.svelte generated by Svelte v3.51.0 */

    function create_fragment$f(ctx) {
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

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Table extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$e, create_fragment$f, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableHead.svelte generated by Svelte v3.51.0 */

    function create_fragment$e(ctx) {
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

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TableHead extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$e, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableBody.svelte generated by Svelte v3.51.0 */

    function create_fragment$d(ctx) {
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

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TableBody extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$d, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableRow.svelte generated by Svelte v3.51.0 */

    function create_fragment$c(ctx) {
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

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TableRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$c, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\TableCell.svelte generated by Svelte v3.51.0 */

    function create_else_block$1(ctx) {
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
    function create_if_block$1(ctx) {
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

    function create_fragment$b(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
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

    function instance$a($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$a, create_fragment$b, safe_not_equal, { header: 0, align: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\List.svelte generated by Svelte v3.51.0 */

    function create_else_block(ctx) {
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
    function create_if_block(ctx) {
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

    function create_fragment$a(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
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

    function instance$9($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, { ordered: 0, start: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\ListItem.svelte generated by Svelte v3.51.0 */

    function create_fragment$9(ctx) {
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

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class ListItem extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Hr.svelte generated by Svelte v3.51.0 */

    function create_fragment$8(ctx) {
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
    		init(this, options, null, create_fragment$8, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Html.svelte generated by Svelte v3.51.0 */

    function create_fragment$7(ctx) {
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

    function instance$7($$self, $$props, $$invalidate) {
    	let { text } = $$props;

    	$$self.$$set = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	return [text];
    }

    class Html extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { text: 0 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Blockquote.svelte generated by Svelte v3.51.0 */

    function create_fragment$6(ctx) {
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

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Blockquote extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Code.svelte generated by Svelte v3.51.0 */

    function create_fragment$5(ctx) {
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

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { lang: 0, text: 1 });
    	}
    }

    /* node_modules\svelte-markdown\src\renderers\Br.svelte generated by Svelte v3.51.0 */

    function create_fragment$4(ctx) {
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Br extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
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

    /* node_modules\svelte-markdown\src\SvelteMarkdown.svelte generated by Svelte v3.51.0 */

    function create_fragment$3(ctx) {
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

    function instance$3($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			source: 2,
    			renderers: 3,
    			options: 4,
    			isInline: 5
    		});
    	}
    }

    var docs = "## Props\r\n| Name | Type | Default | Description |\r\n| --- | --- | --- | --- |\r\n| `adorn` | _boolean_ | | If true, padding will be much smaller than normal\r\n| `buttonColor` | _CSS String_ | | Custom color for the button outside of the standard colors\r\n| `color` | _string_ | `\"default\"` | The coloration of the `Button`. Valid options are `\"default\"`, `\"primary\"`, `\"secondary\"`, and `\"danger\"`\r\n| `compact` | _boolean_ | | If true, default padding will be half the normal size\r\n| `disabled` | _boolean_ | | If true, button will not react to user interaction\r\n| `round` | _string_ | | Makes the corners of the button more or less round. Include CSS units for size\r\n| `square` | _boolean_ | | If true, button will not have rounded corners\r\n| `variant` | _string_ | `\"normal\"` | `Button` style variation. Valid options are: `\"normal\"`, `\"outline\"`, `\"fill\"`\r\n\r\n## Events\r\n- tap\r\n\r\n## Usage\r\n```html\r\n<Button>\r\n    Button Content\r\n</Button>\r\n\r\n<Button>\r\n    <Flex>\r\n        Flex Content\r\n    </Flex>\r\n</Button>\r\n```\r\n";

    /* site\src\component\button.svelte generated by Svelte v3.51.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (22:24) <Text align="center">
    function create_default_slot_9(ctx) {
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

    // (23:24) <Text align="center">
    function create_default_slot_8(ctx) {
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

    // (21:20) <Flex>
    function create_default_slot_7(ctx) {
    	let text0;
    	let t;
    	let text1;
    	let current;

    	text0 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_8] },
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

    // (20:16) <Button {variant} {color}>
    function create_default_slot_6(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
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

    // (19:12) {#each buttonColors as color}
    function create_each_block_2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[2],
    				color: /*color*/ ctx[5],
    				$$slots: { default: [create_default_slot_6] },
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

    // (30:24) <Text align="center">
    function create_default_slot_5(ctx) {
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

    // (31:24) <Text align="center">
    function create_default_slot_4$1(ctx) {
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

    // (32:24) <Text align="center">
    function create_default_slot_3$1(ctx) {
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

    // (29:20) <Flex>
    function create_default_slot_2$1(ctx) {
    	let text0;
    	let t0;
    	let text1;
    	let t1;
    	let text2;
    	let current;

    	text0 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	text2 = new Text$1({
    			props: {
    				align: "center",
    				$$slots: { default: [create_default_slot_3$1] },
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

    // (28:16) <Button {variant} {color} disabled>
    function create_default_slot_1$2(ctx) {
    	let flex;
    	let t;
    	let current;

    	flex = new Flex({
    			props: {
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flex.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(flex, target, anchor);
    			insert(target, t, anchor);
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
    			if (detaching) detach(t);
    		}
    	};
    }

    // (27:12) {#each buttonColors as color}
    function create_each_block_1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[2],
    				color: /*color*/ ctx[5],
    				disabled: true,
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

    // (18:8) {#each buttonTypes as variant}
    function create_each_block(ctx) {
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
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
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
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
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

    // (17:4) <Grid cols="1fr 1fr 1fr 1fr">
    function create_default_slot$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*buttonTypes*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			if (dirty & /*buttonColors, buttonTypes*/ 3) {
    				each_value = /*buttonTypes*/ ctx[0];
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

    function create_fragment$2(ctx) {
    	let div;
    	let grid;
    	let t;
    	let markdown;
    	let current;

    	grid = new Grid({
    			props: {
    				cols: "1fr 1fr 1fr 1fr",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	markdown = new SvelteMarkdown({ props: { source: docs } });

    	return {
    		c() {
    			div = element("div");
    			create_component(grid.$$.fragment);
    			t = space();
    			create_component(markdown.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(grid, div, null);
    			append(div, t);
    			mount_component(markdown, div, null);
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
    			if (detaching) detach(div);
    			destroy_component(grid);
    			destroy_component(markdown);
    		}
    	};
    }

    function instance$2($$self) {
    	const buttonTypes = ["normal", "outline", "fill"];
    	const buttonColors = ["default", "primary", "secondary", "danger"];
    	return [buttonTypes, buttonColors];
    }

    class Button_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    var component = /*#__PURE__*/Object.freeze({
        __proto__: null,
        button: Button_1
    });

    const currentView = writable(
        localStorage.page
        ?? null
    );
    const view = derived(
        [currentView],
        ([current]) => component[current]
    );
    const components = Object.keys(component);

    /* site\src\app\menu.svelte generated by Svelte v3.51.0 */

    function create_default_slot_1$1(ctx) {
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

    // (34:0) <TitleBar>
    function create_default_slot$1(ctx) {
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

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let titlebar0;
    	let t1;
    	let tabs0;
    	let updating_tabGroup;
    	let t2;
    	let titlebar1;
    	let t3;
    	let tabs1;
    	let updating_tabGroup_1;
    	let current;

    	titlebar0 = new Title_bar({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs0_tabGroup_binding(value) {
    		/*tabs0_tabGroup_binding*/ ctx[4](value);
    	}

    	let tabs0_props = {
    		options: /*themes*/ ctx[2],
    		vertical: true
    	};

    	if (/*$themeValue*/ ctx[0] !== void 0) {
    		tabs0_props.tabGroup = /*$themeValue*/ ctx[0];
    	}

    	tabs0 = new Tabs({ props: tabs0_props });
    	binding_callbacks.push(() => bind(tabs0, 'tabGroup', tabs0_tabGroup_binding));

    	titlebar1 = new Title_bar({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs1_tabGroup_binding(value) {
    		/*tabs1_tabGroup_binding*/ ctx[5](value);
    	}

    	let tabs1_props = {
    		options: /*componentList*/ ctx[3],
    		vertical: true
    	};

    	if (/*$currentView*/ ctx[1] !== void 0) {
    		tabs1_props.tabGroup = /*$currentView*/ ctx[1];
    	}

    	tabs1 = new Tabs({ props: tabs1_props });
    	binding_callbacks.push(() => bind(tabs1, 'tabGroup', tabs1_tabGroup_binding));

    	return {
    		c() {
    			div = element("div");
    			t0 = space();
    			create_component(titlebar0.$$.fragment);
    			t1 = space();
    			create_component(tabs0.$$.fragment);
    			t2 = space();
    			create_component(titlebar1.$$.fragment);
    			t3 = space();
    			create_component(tabs1.$$.fragment);
    			set_style(div, "width", "15vw");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t0, anchor);
    			mount_component(titlebar0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(tabs0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(titlebar1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(tabs1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const titlebar0_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				titlebar0_changes.$$scope = { dirty, ctx };
    			}

    			titlebar0.$set(titlebar0_changes);
    			const tabs0_changes = {};

    			if (!updating_tabGroup && dirty & /*$themeValue*/ 1) {
    				updating_tabGroup = true;
    				tabs0_changes.tabGroup = /*$themeValue*/ ctx[0];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs0.$set(tabs0_changes);
    			const titlebar1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				titlebar1_changes.$$scope = { dirty, ctx };
    			}

    			titlebar1.$set(titlebar1_changes);
    			const tabs1_changes = {};

    			if (!updating_tabGroup_1 && dirty & /*$currentView*/ 2) {
    				updating_tabGroup_1 = true;
    				tabs1_changes.tabGroup = /*$currentView*/ ctx[1];
    				add_flush_callback(() => updating_tabGroup_1 = false);
    			}

    			tabs1.$set(tabs1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar0.$$.fragment, local);
    			transition_in(tabs0.$$.fragment, local);
    			transition_in(titlebar1.$$.fragment, local);
    			transition_in(tabs1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar0.$$.fragment, local);
    			transition_out(tabs0.$$.fragment, local);
    			transition_out(titlebar1.$$.fragment, local);
    			transition_out(tabs1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t0);
    			destroy_component(titlebar0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(tabs0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(titlebar1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(tabs1, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $themeValue;
    	let $currentView;
    	component_subscribe($$self, themeValue, $$value => $$invalidate(0, $themeValue = $$value));
    	component_subscribe($$self, currentView, $$value => $$invalidate(1, $currentView = $$value));

    	const themes = [
    		{ label: "Light", value: "light" },
    		{ label: "Dark", value: "dark" },
    		{ label: "Tron", value: "tron" }
    	];

    	const componentList = [
    		{ label: "Home", value: null },
    		...components.map(name => ({
    			value: name,
    			label: `${name.charAt(0).toUpperCase()}${name.slice(1)}`
    		}))
    	];

    	function tabs0_tabGroup_binding(value) {
    		$themeValue = value;
    		themeValue.set($themeValue);
    	}

    	function tabs1_tabGroup_binding(value) {
    		$currentView = value;
    		currentView.set($currentView);
    	}

    	return [
    		$themeValue,
    		$currentView,
    		themes,
    		componentList,
    		tabs0_tabGroup_binding,
    		tabs1_tabGroup_binding
    	];
    }

    class Menu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* site\src\app.svelte generated by Svelte v3.51.0 */

    function add_css(target) {
    	append_styles(target, "svelte-8qmcbi", "table{border:1px solid var(--primary);border-collapse:collapse;border-radius:4px}td, th{border:1px solid var(--primary);padding:4px}");
    }

    // (50:4) <Paper lscrollable square>
    function create_default_slot_4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*$view*/ ctx[1];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
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
    			if (switch_value !== (switch_value = /*$view*/ ctx[1])) {
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

    // (39:0) <Screen>
    function create_default_slot_3(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				lscrollable: true,
    				square: true,
    				$$slots: { default: [create_default_slot_4] },
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

    			if (dirty & /*$$scope, $view*/ 10) {
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

    // (40:4) <AppBar slot="title">
    function create_default_slot_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Svelte Doric Components");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (44:12) <Button compact on:tap={openMenu}>
    function create_default_slot_1(ctx) {
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

    // (43:8) <Adornment slot="menu">
    function create_default_slot(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				compact: true,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*openMenu*/ ctx[2]);

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

    			if (dirty & /*$$scope*/ 8) {
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

    // (43:8) 
    function create_menu_slot(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				slot: "menu",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				adornment_changes.$$scope = { dirty, ctx };
    			}

    			adornment.$set(adornment_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment, detaching);
    		}
    	};
    }

    // (40:4) 
    function create_title_slot(ctx) {
    	let appbar;
    	let current;

    	appbar = new App_bar({
    			props: {
    				slot: "title",
    				$$slots: {
    					menu: [create_menu_slot],
    					default: [create_default_slot_2]
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

    			if (dirty & /*$$scope*/ 8) {
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
    	let screen;
    	let current;

    	appstyle = new App_style({
    			props: { baseline: Baseline, theme: /*$theme*/ ctx[0] }
    		});

    	screen = new Screen({
    			props: {
    				$$slots: {
    					title: [create_title_slot],
    					default: [create_default_slot_3]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(appstyle.$$.fragment);
    			t = space();
    			create_component(screen.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appstyle, target, anchor);
    			insert(target, t, anchor);
    			mount_component(screen, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const appstyle_changes = {};
    			if (dirty & /*$theme*/ 1) appstyle_changes.theme = /*$theme*/ ctx[0];
    			appstyle.$set(appstyle_changes);
    			const screen_changes = {};

    			if (dirty & /*$$scope, $view*/ 10) {
    				screen_changes.$$scope = { dirty, ctx };
    			}

    			screen.$set(screen_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appstyle.$$.fragment, local);
    			transition_in(screen.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appstyle.$$.fragment, local);
    			transition_out(screen.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appstyle, detaching);
    			if (detaching) detach(t);
    			destroy_component(screen, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $theme;
    	let $view;
    	component_subscribe($$self, theme, $$value => $$invalidate(0, $theme = $$value));
    	component_subscribe($$self, view, $$value => $$invalidate(1, $view = $$value));
    	const openMenu = () => drawer.open(Menu);
    	return [$theme, $view, openMenu];
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
