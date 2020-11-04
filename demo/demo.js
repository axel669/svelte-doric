var demo = (function () {
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
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function null_to_empty(value) {
        return value == null ? '' : value;
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
            node[prop] = value;
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
        node.style.setProperty(key, value, important ? 'important' : '');
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
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
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

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
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
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
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
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
            const d = program.b - t;
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
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

    const touchState = {};

    if (typeof window !== "undefined") {
        if (window.ontouchstart === undefined) {
            window.addEventListener(
                "mousedown",
                evt => {
                    if (evt.button !== 0) {
                        return
                    }
                    const customEvt = new CustomEvent("touchstart");
                    evt.identifier = -1;
                    customEvt.changedTouches = [evt];
                    evt.target.dispatchEvent(customEvt);
                },
                {capture: true}
            );
            window.addEventListener(
                "mouseup",
                evt => {
                    if (evt.button !== 0) {
                        return
                    }
                    const customEvt = new CustomEvent("touchend");
                    evt.identifier = -1;
                    customEvt.changedTouches = [evt];
                    evt.target.dispatchEvent(customEvt);
                },
                {capture: true}
            );
        }

        window.addEventListener(
            "touchstart",
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
            "touchend",
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

                    const customEvent = new CustomEvent("tap");
                    customEvent.changedTouches = [touch];
                    touch.target.dispatchEvent(customEvent);
                }
            },
            {capture: true}
        );
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
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

    const css = (parts, ...values) => {
        const css = parts
            .reduce(
                (cssParts, part, index) => [
                    ...cssParts,
                    part,
                    values[index] ?? ""
                ],
                []
            )
            .join("");
        return `<style>\n${css}\n</style>`
    };

    /* core\ripple.svelte generated by Svelte v3.29.4 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-4mv18w-style";
    	style.textContent = "ripple-wrapper.svelte-4mv18w{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-4mv18w{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (111:4) {#each ripples as info (info.id)}
    function create_each_block(key_1, ctx) {
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
    			attr(ripple, "class", "svelte-4mv18w");
    			this.first = ripple;
    		},
    		m(target, anchor) {
    			insert(target, ripple, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, ripple, /*rippleVars*/ ctx[5](/*info*/ ctx[10], /*color*/ ctx[0])));
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (vars_action && is_function(vars_action.update) && dirty & /*ripples, color*/ 3) vars_action.update.call(null, /*rippleVars*/ ctx[5](/*info*/ ctx[10], /*color*/ ctx[0]));
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

    function create_fragment(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let ripple_wrapper_resize_listener;
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[10].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			ripple_wrapper = element("ripple-wrapper");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(ripple_wrapper, "class", "svelte-4mv18w");
    			add_render_callback(() => /*ripple_wrapper_elementresize_handler*/ ctx[7].call(ripple_wrapper));
    		},
    		m(target, anchor) {
    			insert(target, ripple_wrapper, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ripple_wrapper, null);
    			}

    			ripple_wrapper_resize_listener = add_resize_listener(ripple_wrapper, /*ripple_wrapper_elementresize_handler*/ ctx[7].bind(ripple_wrapper));

    			if (!mounted) {
    				dispose = listen(ripple_wrapper, "touchstart", /*addRipple*/ ctx[4], { passive: true });
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*rippleVars, ripples, color*/ 35) {
    				const each_value = /*ripples*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block, null, get_each_context);
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

    			ripple_wrapper_resize_listener();
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

    const duration = 500;

    function instance($$self, $$props, $$invalidate) {
    	let { color = null } = $$props;
    	let { disabled = false } = $$props;
    	let ripples = [];
    	let height = 0;
    	let width = 0;

    	const addRipple = evt => {
    		if (disabled === true) {
    			return;
    		}

    		for (const touch of evt.changedTouches) {
    			const { x, y } = calcOffset(touch);
    			const ripple = { id: Date.now(), x, y, size };
    			$$invalidate(1, ripples = [...ripples, ripple]);
    			setTimeout(() => $$invalidate(1, ripples = ripples.filter(r => r !== ripple)), duration);
    		}
    	};

    	const rippleVars = (info, color) => ({
    		"x": [info.x, "px"],
    		"y": [info.y, "px"],
    		"size": [info.size, "px"],
    		"ripple-color": color
    	});

    	function ripple_wrapper_elementresize_handler() {
    		height = this.offsetHeight;
    		width = this.offsetWidth;
    		$$invalidate(2, height);
    		$$invalidate(3, width);
    	}

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(6, disabled = $$props.disabled);
    	};

    	let size;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width, height*/ 12) {
    			 size = Math.max(width, height) * 2;
    		}
    	};

    	return [
    		color,
    		ripples,
    		height,
    		width,
    		addRipple,
    		rippleVars,
    		disabled,
    		ripple_wrapper_elementresize_handler
    	];
    }

    class Ripple extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-4mv18w-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { color: 0, disabled: 6 });
    	}
    }

    /* core\adornment.svelte generated by Svelte v3.29.4 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1issscl-style";
    	style.textContent = "adornment.svelte-1issscl{display:inline-flex;justify-content:center;align-items:center;padding:4px}adornment.start.svelte-1issscl{grid-area:start-adornment}adornment.end.svelte-1issscl{grid-area:end-adornment}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let adornment;
    	let adornment_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			adornment = element("adornment");
    			if (default_slot) default_slot.c();
    			attr(adornment, "class", adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-1issscl"));
    			attr(adornment, "style", /*style*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, adornment, anchor);

    			if (default_slot) {
    				default_slot.m(adornment, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*position*/ 1 && adornment_class_value !== (adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-1issscl"))) {
    				attr(adornment, "class", adornment_class_value);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr(adornment, "style", /*style*/ ctx[1]);
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
    			if (detaching) detach(adornment);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { position = "" } = $$props;
    	let { style } = $$props;

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(0, position = $$props.position);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [position, style, $$scope, slots];
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1issscl-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { position: 0, style: 1 });
    	}
    }

    /* core\app-bar.svelte generated by Svelte v3.29.4 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1ygbcur-style";
    	style.textContent = "app-bar.svelte-1ygbcur{position:sticky;top:0px;left:0px;right:0px;height:56px;z-index:+50;background-color:var(--app-bar-background);color:var(--app-bar-text);display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment title end-adornment\"\r\n    ;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25);--button-fab-color:var(--app-bar-text);--ripple-color:var(--ripple-dark)}app-bar.flow.svelte-1ygbcur{position:relative;z-index:+0}app-bar.svelte-1ygbcur app-title{grid-area:title;font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}";
    	append(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let app_bar;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			app_bar = element("app-bar");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(app_bar, "class", "svelte-1ygbcur");
    			toggle_class(app_bar, "flow", /*flow*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, app_bar, anchor);

    			if (default_slot) {
    				default_slot.m(app_bar, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (dirty & /*flow*/ 1) {
    				toggle_class(app_bar, "flow", /*flow*/ ctx[0]);
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
    			if (detaching) detach(app_bar);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { flow } = $$props;

    	$$self.$$set = $$props => {
    		if ("flow" in $$props) $$invalidate(0, flow = $$props.flow);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [flow, $$scope, slots];
    }

    class App_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1ygbcur-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { flow: 0 });
    	}
    }

    /* core\app-theme.svelte generated by Svelte v3.29.4 */

    function create_fragment$3(ctx) {
    	let switch_instance0;
    	let t;
    	let switch_instance1;
    	let switch_instance1_anchor;
    	let current;
    	var switch_value = /*theme*/ ctx[0];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance0 = new switch_value(switch_props());
    	}

    	var switch_value_1 = /*baseline*/ ctx[1];

    	function switch_props_1(ctx) {
    		return {};
    	}

    	if (switch_value_1) {
    		switch_instance1 = new switch_value_1(switch_props_1());
    	}

    	return {
    		c() {
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t = space();
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			switch_instance1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance0) {
    				mount_component(switch_instance0, target, anchor);
    			}

    			insert(target, t, anchor);

    			if (switch_instance1) {
    				mount_component(switch_instance1, target, anchor);
    			}

    			insert(target, switch_instance1_anchor, anchor);
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
    					switch_instance0 = new switch_value(switch_props());
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, t.parentNode, t);
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
    					switch_instance1 = new switch_value_1(switch_props_1());
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, switch_instance1_anchor.parentNode, switch_instance1_anchor);
    				} else {
    					switch_instance1 = null;
    				}
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { theme = null } = $$props;
    	let { baseline = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("baseline" in $$props) $$invalidate(1, baseline = $$props.baseline);
    	};

    	return [theme, baseline];
    }

    class App_theme extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

    /* core\avatar.svelte generated by Svelte v3.29.4 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-1wdv2nx-style";
    	style.textContent = "avatar.svelte-1wdv2nx{display:inline-flex;background-image:var(--avatar-image);background-position:center center;background-size:var(--avatar-image-size);width:var(--avatar-size);height:var(--avatar-size);border-radius:50%;justify-content:center;align-items:center;background-color:var(--avatar-background, var(--button-default-fill));color:var(--avatar-text, var(--button-default-text));font-size:var(--text-size-header)}";
    	append(document.head, style);
    }

    function create_fragment$4(ctx) {
    	let avatar;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			avatar = element("avatar");
    			if (default_slot) default_slot.c();
    			attr(avatar, "class", "svelte-1wdv2nx");
    		},
    		m(target, anchor) {
    			insert(target, avatar, anchor);

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
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { size = "36px" } = $$props;
    	let { imageSize = "contain" } = $$props;
    	let { image } = $$props;
    	let { textColor } = $$props;
    	let { background } = $$props;

    	$$self.$$set = $$props => {
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("imageSize" in $$props) $$invalidate(2, imageSize = $$props.imageSize);
    		if ("image" in $$props) $$invalidate(3, image = $$props.image);
    		if ("textColor" in $$props) $$invalidate(4, textColor = $$props.textColor);
    		if ("background" in $$props) $$invalidate(5, background = $$props.background);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	let avatarVars;

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
    		if (!document.getElementById("svelte-1wdv2nx-style")) add_css$3();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			size: 1,
    			imageSize: 2,
    			image: 3,
    			textColor: 4,
    			background: 5
    		});
    	}
    }

    /* core\baseline.svelte generated by Svelte v3.29.4 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-5rcxzn-style";
    	style.textContent = "html{margin:0px;padding:0px;width:100%;height:100%}body{margin:0px;padding:0px;width:100%;min-height:100%;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--app-bar-background:var(--primary);--app-bar-text:var(--text-invert);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--text-normal);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger)}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let link0;
    	let link1;
    	let link2;

    	return {
    		c() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			attr(link0, "href", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700");
    			attr(link0, "rel", "stylesheet");
    			attr(link0, "type", "text/css");
    			attr(link1, "href", "https://fonts.googleapis.com/css?family=Inconsolata:300,400,500,700");
    			attr(link1, "rel", "stylesheet");
    			attr(link1, "type", "text/css");
    			attr(link2, "href", "https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined");
    			attr(link2, "rel", "stylesheet");
    		},
    		m(target, anchor) {
    			append(document.head, link0);
    			append(document.head, link1);
    			append(document.head, link2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			detach(link0);
    			detach(link1);
    			detach(link2);
    		}
    	};
    }

    class Baseline extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-5rcxzn-style")) add_css$4();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    var bubbler = (handler) => {
        const component = get_current_component();
        const bubbleEvent = evt => bubble(component, evt);

        return evt => handler(evt, bubbleEvent)
    };

    /* core\button.svelte generated by Svelte v3.29.4 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-unpwzf-style";
    	style.textContent = "button-content.svelte-unpwzf{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;z-index:+1;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}.round.svelte-unpwzf{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.fab.svelte-unpwzf{width:var(--button-round-size);color:var(--button-fab-color);padding:0px}.disabled.svelte-unpwzf{filter:contrast(50%)}.primary.svelte-unpwzf{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-unpwzf{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-unpwzf{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-unpwzf{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--text-color)}.outline.svelte-unpwzf{border:1px solid var(--button-color);color:var(--button-color)}";
    	append(document.head, style);
    }

    function create_fragment$6(ctx) {
    	let button_content;
    	let t;
    	let ripple;
    	let button_content_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[3] } });

    	return {
    		c() {
    			button_content = element("button-content");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(button_content, "class", button_content_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[6] + " svelte-unpwzf"));
    			set_custom_element_data(button_content, "style", /*style*/ ctx[2]);
    			toggle_class(button_content, "disabled", /*disabled*/ ctx[3]);
    			toggle_class(button_content, "round", /*round*/ ctx[4]);
    			toggle_class(button_content, "fab", /*fab*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, button_content, anchor);

    			if (default_slot) {
    				default_slot.m(button_content, null);
    			}

    			append(button_content, t);
    			mount_component(ripple, button_content, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button_content, "click", /*clicks*/ ctx[8]),
    					action_destroyer(vars_action = vars.call(null, button_content, /*buttonVars*/ ctx[7]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 512) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}

    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 8) ripple_changes.disabled = /*disabled*/ ctx[3];
    			ripple.$set(ripple_changes);

    			if (!current || dirty & /*color, variant, klass*/ 67 && button_content_class_value !== (button_content_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[6] + " svelte-unpwzf"))) {
    				set_custom_element_data(button_content, "class", button_content_class_value);
    			}

    			if (!current || dirty & /*style*/ 4) {
    				set_custom_element_data(button_content, "style", /*style*/ ctx[2]);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 128) vars_action.update.call(null, /*buttonVars*/ ctx[7]);

    			if (dirty & /*color, variant, klass, disabled*/ 75) {
    				toggle_class(button_content, "disabled", /*disabled*/ ctx[3]);
    			}

    			if (dirty & /*color, variant, klass, round*/ 83) {
    				toggle_class(button_content, "round", /*round*/ ctx[4]);
    			}

    			if (dirty & /*color, variant, klass, fab*/ 99) {
    				toggle_class(button_content, "fab", /*fab*/ ctx[5]);
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
    			if (detaching) detach(button_content);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { color = "default" } = $$props;
    	let { variant = "normal" } = $$props;
    	let { style = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { round } = $$props;
    	let { fab } = $$props;
    	let { class: klass = "" } = $$props;

    	const clicks = bubbler((evt, bubble) => {
    		if (disabled === true) {
    			return;
    		}

    		bubble(evt);
    	});

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("variant" in $$props) $$invalidate(1, variant = $$props.variant);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("disabled" in $$props) $$invalidate(3, disabled = $$props.disabled);
    		if ("round" in $$props) $$invalidate(4, round = $$props.round);
    		if ("fab" in $$props) $$invalidate(5, fab = $$props.fab);
    		if ("class" in $$props) $$invalidate(6, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	let buttonVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*round*/ 16) {
    			 $$invalidate(7, buttonVars = { "button-round-size": round });
    		}
    	};

    	return [
    		color,
    		variant,
    		style,
    		disabled,
    		round,
    		fab,
    		klass,
    		buttonVars,
    		clicks,
    		$$scope,
    		slots
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-unpwzf-style")) add_css$5();

    		init(this, options, instance$5, create_fragment$6, safe_not_equal, {
    			color: 0,
    			variant: 1,
    			style: 2,
    			disabled: 3,
    			round: 4,
    			fab: 5,
    			class: 6
    		});
    	}
    }

    /* core\card\content.svelte generated by Svelte v3.29.4 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-wwvc5k-style";
    	style.textContent = "card-content.svelte-wwvc5k{display:block;padding:16px}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
    	let card_content;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			card_content = element("card-content");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(card_content, "class", "svelte-wwvc5k");
    		},
    		m(target, anchor) {
    			insert(target, card_content, anchor);

    			if (default_slot) {
    				default_slot.m(card_content, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
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
    			if (detaching) detach(card_content);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Content extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-wwvc5k-style")) add_css$6();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* core\card.svelte generated by Svelte v3.29.4 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-yxlj1r-style";
    	style.textContent = "card.svelte-yxlj1r:not(.content):not(.actions){display:grid;border-radius:4px;margin:4px;background-color:var(--card-background);border:var(--card-border);box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25);overflow:hidden}";
    	append(document.head, style);
    }

    function create_fragment$8(ctx) {
    	let card;
    	let card_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			card = element("card");
    			if (default_slot) default_slot.c();
    			attr(card, "style", /*style*/ ctx[0]);
    			attr(card, "class", card_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-yxlj1r"));
    		},
    		m(target, anchor) {
    			insert(target, card, anchor);

    			if (default_slot) {
    				default_slot.m(card, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*style*/ 1) {
    				attr(card, "style", /*style*/ ctx[0]);
    			}

    			if (!current || dirty & /*klass*/ 2 && card_class_value !== (card_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-yxlj1r"))) {
    				attr(card, "class", card_class_value);
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
    			if (detaching) detach(card);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { style } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [style, klass, $$scope, slots];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-yxlj1r-style")) add_css$7();
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, { style: 0, class: 1 });
    	}
    }

    /* core\toggle\base.svelte generated by Svelte v3.29.4 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-8q8ohz-style";
    	style.textContent = "toggle-wrapper.svelte-8q8ohz.svelte-8q8ohz{position:relative;display:inline-grid;border-radius:4px;overflow:hidden;column-gap:4px;user-select:none}toggle-wrapper.svelte-8q8ohz .svelte-8q8ohz:first-child{grid-area:symbol;align-self:center;justify-self:center}toggle-wrapper.svelte-8q8ohz>.svelte-8q8ohz:nth-child(2){grid-area:label}.disabled.svelte-8q8ohz.svelte-8q8ohz{filter:contrast(50%)}.right.svelte-8q8ohz.svelte-8q8ohz{grid-template-columns:min-content auto;grid-template-areas:\"symbol label\"\r\n    }.left.svelte-8q8ohz.svelte-8q8ohz{grid-template-columns:auto min-content;grid-template-areas:\"label symbol\"\r\n    }.top.svelte-8q8ohz.svelte-8q8ohz{grid-template-rows:auto min-content;grid-template-areas:\"label\"\r\n        \"symbol\"\r\n    }.bottom.svelte-8q8ohz.svelte-8q8ohz{grid-template-rows:min-content auto;grid-template-areas:\"symbol\"\r\n        \"label\"\r\n    }toggle-wrapper.top.svelte-8q8ohz>.svelte-8q8ohz,toggle-wrapper.bottom.svelte-8q8ohz>.svelte-8q8ohz{justify-content:center}toggle-label.svelte-8q8ohz.svelte-8q8ohz{display:grid;align-items:center}.labelToggle.svelte-8q8ohz.svelte-8q8ohz{cursor:pointer}";
    	append(document.head, style);
    }

    const get_label_slot_changes = dirty => ({});
    const get_label_slot_context = ctx => ({});

    function create_fragment$9(ctx) {
    	let toggle_wrapper;
    	let t;
    	let toggle_label;
    	let toggle_wrapper_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const label_slot_template = /*#slots*/ ctx[11].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[10], get_label_slot_context);

    	return {
    		c() {
    			toggle_wrapper = element("toggle-wrapper");
    			if (default_slot) default_slot.c();
    			t = space();
    			toggle_label = element("toggle-label");
    			if (label_slot) label_slot.c();
    			set_custom_element_data(toggle_label, "class", "svelte-8q8ohz");
    			toggle_class(toggle_label, "labelToggle", /*labelToggle*/ ctx[1]);
    			set_custom_element_data(toggle_wrapper, "disabled", /*disabled*/ ctx[0]);
    			set_custom_element_data(toggle_wrapper, "style", /*style*/ ctx[3]);
    			set_custom_element_data(toggle_wrapper, "class", toggle_wrapper_class_value = "" + (/*labelPlacement*/ ctx[2] + " " + /*klass*/ ctx[4] + " svelte-8q8ohz"));
    		},
    		m(target, anchor) {
    			insert(target, toggle_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(toggle_wrapper, null);
    			}

    			append(toggle_wrapper, t);
    			append(toggle_wrapper, toggle_label);

    			if (label_slot) {
    				label_slot.m(toggle_label, null);
    			}

    			/*toggle_label_binding*/ ctx[12](toggle_label);
    			current = true;

    			if (!mounted) {
    				dispose = listen(toggle_wrapper, "click", /*boxClick*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			if (label_slot) {
    				if (label_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(label_slot, label_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_label_slot_changes, get_label_slot_context);
    				}
    			}

    			if (dirty & /*labelToggle*/ 2) {
    				toggle_class(toggle_label, "labelToggle", /*labelToggle*/ ctx[1]);
    			}

    			if (!current || dirty & /*disabled*/ 1) {
    				set_custom_element_data(toggle_wrapper, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (!current || dirty & /*style*/ 8) {
    				set_custom_element_data(toggle_wrapper, "style", /*style*/ ctx[3]);
    			}

    			if (!current || dirty & /*labelPlacement, klass*/ 20 && toggle_wrapper_class_value !== (toggle_wrapper_class_value = "" + (/*labelPlacement*/ ctx[2] + " " + /*klass*/ ctx[4] + " svelte-8q8ohz"))) {
    				set_custom_element_data(toggle_wrapper, "class", toggle_wrapper_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(label_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(label_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(toggle_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (label_slot) label_slot.d(detaching);
    			/*toggle_label_binding*/ ctx[12](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { checked = false } = $$props;
    	let { toggle } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { labelToggle = true } = $$props;
    	let { labelPlacement = "right" } = $$props;
    	let { style = "" } = $$props;
    	let { class: klass = "" } = $$props;
    	let labelElement;

    	const boxClick = evt => {
    		if (disabled === true) {
    			return;
    		}

    		if (labelToggle === false && labelElement.contains(evt.target)) {
    			return;
    		}

    		toggle();
    	};

    	function toggle_label_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			labelElement = $$value;
    			$$invalidate(5, labelElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("checked" in $$props) $$invalidate(7, checked = $$props.checked);
    		if ("toggle" in $$props) $$invalidate(8, toggle = $$props.toggle);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("color" in $$props) $$invalidate(9, color = $$props.color);
    		if ("labelToggle" in $$props) $$invalidate(1, labelToggle = $$props.labelToggle);
    		if ("labelPlacement" in $$props) $$invalidate(2, labelPlacement = $$props.labelPlacement);
    		if ("style" in $$props) $$invalidate(3, style = $$props.style);
    		if ("class" in $$props) $$invalidate(4, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, color*/ 640) ;
    	};

    	return [
    		disabled,
    		labelToggle,
    		labelPlacement,
    		style,
    		klass,
    		labelElement,
    		boxClick,
    		checked,
    		toggle,
    		color,
    		$$scope,
    		slots,
    		toggle_label_binding
    	];
    }

    class Base extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-8q8ohz-style")) add_css$8();

    		init(this, options, instance$8, create_fragment$9, safe_not_equal, {
    			checked: 7,
    			toggle: 8,
    			disabled: 0,
    			color: 9,
    			labelToggle: 1,
    			labelPlacement: 2,
    			style: 3,
    			class: 4
    		});
    	}
    }

    /* core\icon.svelte generated by Svelte v3.29.4 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-lh4ed6-style";
    	style.textContent = "icon.svelte-lh4ed6{font-size:var(--icon-font-size);margin:0px 4px}";
    	append(document.head, style);
    }

    function create_fragment$a(ctx) {
    	let icon;
    	let t;
    	let vars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			icon = element("icon");
    			t = text(/*name*/ ctx[0]);
    			attr(icon, "style", /*style*/ ctx[2]);
    			attr(icon, "class", "svelte-lh4ed6");
    			toggle_class(icon, "material-icons", !/*outlined*/ ctx[1]);
    			toggle_class(icon, "material-icons-outlined", /*outlined*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, icon, anchor);
    			append(icon, t);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, icon, /*iconVars*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data(t, /*name*/ ctx[0]);

    			if (dirty & /*style*/ 4) {
    				attr(icon, "style", /*style*/ ctx[2]);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*iconVars*/ 8) vars_action.update.call(null, /*iconVars*/ ctx[3]);

    			if (dirty & /*outlined*/ 2) {
    				toggle_class(icon, "material-icons", !/*outlined*/ ctx[1]);
    			}

    			if (dirty & /*outlined*/ 2) {
    				toggle_class(icon, "material-icons-outlined", /*outlined*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(icon);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { outlined = false } = $$props;
    	let { size } = $$props;
    	let { style = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("outlined" in $$props) $$invalidate(1, outlined = $$props.outlined);
    		if ("size" in $$props) $$invalidate(4, size = $$props.size);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    	};

    	let iconVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 16) {
    			 $$invalidate(3, iconVars = { "icon-font-size": size });
    		}
    	};

    	return [name, outlined, style, iconVars, size];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-lh4ed6-style")) add_css$9();
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, { name: 0, outlined: 1, size: 4, style: 2 });
    	}
    }

    /* core\checkbox.svelte generated by Svelte v3.29.4 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-gylpn1-style";
    	style.textContent = "checkbox-label.svelte-gylpn1{display:flex;align-items:center}checkbox-check.svelte-gylpn1{grid-area:symbol;align-self:center;justify-self:center}";
    	append(document.head, style);
    }

    // (61:8) <Button round="40px" color={buttonColor} {disabled} fab>
    function create_default_slot_1(ctx) {
    	let icon_1;
    	let current;

    	icon_1 = new Icon({
    			props: {
    				name: /*icon*/ ctx[5],
    				size: "22px",
    				outlined: /*outlined*/ ctx[4]
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
    			if (dirty & /*icon*/ 32) icon_1_changes.name = /*icon*/ ctx[5];
    			if (dirty & /*outlined*/ 16) icon_1_changes.outlined = /*outlined*/ ctx[4];
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

    // (65:4) <checkbox-label slot="label">
    function create_label_slot(ctx) {
    	let checkbox_label;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

    	return {
    		c() {
    			checkbox_label = element("checkbox-label");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(checkbox_label, "slot", "label");
    			set_custom_element_data(checkbox_label, "class", "svelte-gylpn1");
    		},
    		m(target, anchor) {
    			insert(target, checkbox_label, anchor);

    			if (default_slot) {
    				default_slot.m(checkbox_label, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16384) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[14], dirty, null, null);
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
    			if (detaching) detach(checkbox_label);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (59:0) <ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement}>
    function create_default_slot(ctx) {
    	let checkbox_check;
    	let button;
    	let t;
    	let current;

    	button = new Button({
    			props: {
    				round: "40px",
    				color: /*buttonColor*/ ctx[6],
    				disabled: /*disabled*/ ctx[1],
    				fab: true,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			checkbox_check = element("checkbox-check");
    			create_component(button.$$.fragment);
    			t = space();
    			set_custom_element_data(checkbox_check, "class", "svelte-gylpn1");
    		},
    		m(target, anchor) {
    			insert(target, checkbox_check, anchor);
    			mount_component(button, checkbox_check, null);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*buttonColor*/ 64) button_changes.color = /*buttonColor*/ ctx[6];
    			if (dirty & /*disabled*/ 2) button_changes.disabled = /*disabled*/ ctx[1];

    			if (dirty & /*$$scope, icon, outlined*/ 16432) {
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
    			if (detaching) detach(checkbox_check);
    			destroy_component(button);
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let togglebase;
    	let current;

    	togglebase = new Base({
    			props: {
    				checked: /*checked*/ ctx[0],
    				disabled: /*disabled*/ ctx[1],
    				toggle: /*toggle*/ ctx[7],
    				color: /*color*/ ctx[2],
    				labelPlacement: /*labelPlacement*/ ctx[3],
    				$$slots: {
    					default: [create_default_slot],
    					label: [create_label_slot]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(togglebase.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(togglebase, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const togglebase_changes = {};
    			if (dirty & /*checked*/ 1) togglebase_changes.checked = /*checked*/ ctx[0];
    			if (dirty & /*disabled*/ 2) togglebase_changes.disabled = /*disabled*/ ctx[1];
    			if (dirty & /*color*/ 4) togglebase_changes.color = /*color*/ ctx[2];
    			if (dirty & /*labelPlacement*/ 8) togglebase_changes.labelPlacement = /*labelPlacement*/ ctx[3];

    			if (dirty & /*$$scope, buttonColor, disabled, icon, outlined*/ 16498) {
    				togglebase_changes.$$scope = { dirty, ctx };
    			}

    			togglebase.$set(togglebase_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(togglebase.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(togglebase.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(togglebase, detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { group = [] } = $$props;
    	let { value } = $$props;
    	let { checked = group.indexOf(value) !== -1 } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { functional = false } = $$props;
    	let { labelPlacement } = $$props;
    	let { checkedIcon = "check_box" } = $$props;
    	let { uncheckedIcon = "check_box_outline_blank" } = $$props;
    	let { outlined } = $$props;
    	const dispatch = createEventDispatcher();

    	const toggle = () => {
    		const next = !checked;

    		if (functional !== true) {
    			$$invalidate(0, checked = next);
    		}

    		dispatch("change", next);
    	};

    	const updateGroup = checked => {
    		if (checked === false) {
    			if (group.indexOf(value) !== -1) {
    				$$invalidate(8, group = group.filter(v => v !== value));
    			}

    			return;
    		}

    		if (group.indexOf(value) === -1) {
    			$$invalidate(8, group = [...group, value]);
    		}
    	};

    	$$self.$$set = $$props => {
    		if ("group" in $$props) $$invalidate(8, group = $$props.group);
    		if ("value" in $$props) $$invalidate(9, value = $$props.value);
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("functional" in $$props) $$invalidate(10, functional = $$props.functional);
    		if ("labelPlacement" in $$props) $$invalidate(3, labelPlacement = $$props.labelPlacement);
    		if ("checkedIcon" in $$props) $$invalidate(11, checkedIcon = $$props.checkedIcon);
    		if ("uncheckedIcon" in $$props) $$invalidate(12, uncheckedIcon = $$props.uncheckedIcon);
    		if ("outlined" in $$props) $$invalidate(4, outlined = $$props.outlined);
    		if ("$$scope" in $$props) $$invalidate(14, $$scope = $$props.$$scope);
    	};

    	let icon;
    	let buttonColor;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, checkedIcon, uncheckedIcon*/ 6145) {
    			 $$invalidate(5, icon = checked ? checkedIcon : uncheckedIcon);
    		}

    		if ($$self.$$.dirty & /*checked, color*/ 5) {
    			 $$invalidate(6, buttonColor = checked ? color : "default");
    		}

    		if ($$self.$$.dirty & /*checked*/ 1) {
    			 updateGroup(checked);
    		}
    	};

    	return [
    		checked,
    		disabled,
    		color,
    		labelPlacement,
    		outlined,
    		icon,
    		buttonColor,
    		toggle,
    		group,
    		value,
    		functional,
    		checkedIcon,
    		uncheckedIcon,
    		slots,
    		$$scope
    	];
    }

    class Checkbox extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-gylpn1-style")) add_css$a();

    		init(this, options, instance$a, create_fragment$b, safe_not_equal, {
    			group: 8,
    			value: 9,
    			checked: 0,
    			disabled: 1,
    			color: 2,
    			functional: 10,
    			labelPlacement: 3,
    			checkedIcon: 11,
    			uncheckedIcon: 12,
    			outlined: 4
    		});
    	}
    }

    /* core\chip.svelte generated by Svelte v3.29.4 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-clgpyh-style";
    	style.textContent = "chip.svelte-clgpyh{position:relative;overflow:hidden;vertical-align:text-bottom;display:inline-grid;grid-template-columns:minmax(8px, min-content) auto minmax(8px, min-content)\r\n        ;grid-template-areas:\"start-adornment content end-adornment\"\r\n        ;border-radius:16px;height:30px;user-select:none;margin:2px;--fill-color:var(--button-default-fill);--text-color:var(--text-invert);background-color:var(--fill-color);color:var(--text-color);font-weight:500;font-size:var(--text-size-info)}chip.clickable.svelte-clgpyh{cursor:pointer}chip.primary.svelte-clgpyh{--fill-color:var(--primary)}chip.secondary.svelte-clgpyh{--fill-color:var(--secondary)}chip.danger.svelte-clgpyh{--fill-color:var(--danger)}div.svelte-clgpyh{grid-area:content;display:flex;align-items:center}";
    	append(document.head, style);
    }

    // (56:4) {#if clickable}
    function create_if_block(ctx) {
    	let ripple;
    	let current;
    	ripple = new Ripple({});

    	return {
    		c() {
    			create_component(ripple.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(ripple, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(ripple, detaching);
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let chip;
    	let t0;
    	let t1;
    	let div;
    	let t2;
    	let chip_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*clickable*/ ctx[2] && create_if_block();
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			chip = element("chip");
    			if (if_block) if_block.c();
    			t0 = space();
    			if (default_slot) default_slot.c();
    			t1 = space();
    			div = element("div");
    			t2 = text(/*label*/ ctx[0]);
    			attr(div, "class", "svelte-clgpyh");
    			attr(chip, "class", chip_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-clgpyh"));
    			toggle_class(chip, "clickable", /*clickable*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, chip, anchor);
    			if (if_block) if_block.m(chip, null);
    			append(chip, t0);

    			if (default_slot) {
    				default_slot.m(chip, null);
    			}

    			append(chip, t1);
    			append(chip, div);
    			append(div, t2);
    			current = true;

    			if (!mounted) {
    				dispose = listen(chip, "click", /*click_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*clickable*/ ctx[2]) {
    				if (if_block) {
    					if (dirty & /*clickable*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block();
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(chip, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*label*/ 1) set_data(t2, /*label*/ ctx[0]);

    			if (!current || dirty & /*color*/ 2 && chip_class_value !== (chip_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-clgpyh"))) {
    				attr(chip, "class", chip_class_value);
    			}

    			if (dirty & /*color, clickable*/ 6) {
    				toggle_class(chip, "clickable", /*clickable*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(chip);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label } = $$props;
    	let { color } = $$props;
    	let { clickable } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("clickable" in $$props) $$invalidate(2, clickable = $$props.clickable);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [label, color, clickable, $$scope, slots, click_handler];
    }

    class Chip extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-clgpyh-style")) add_css$b();
    		init(this, options, instance$b, create_fragment$c, safe_not_equal, { label: 0, color: 1, clickable: 2 });
    	}
    }

    /* core\portal.svelte generated by Svelte v3.29.4 */

    function create_fragment$d(ctx) {
    	let portal_element;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			portal_element = element("portal-element");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, portal_element, anchor);

    			if (default_slot) {
    				default_slot.m(portal_element, null);
    			}

    			/*portal_element_binding*/ ctx[3](portal_element);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
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
    			if (detaching) detach(portal_element);
    			if (default_slot) default_slot.d(detaching);
    			/*portal_element_binding*/ ctx[3](null);
    		}
    	};
    }

    const portalRoot = document.createElement("portal-root");

    if (typeof document !== "undefined") {
    	document.body.appendChild(portalRoot);
    }



    function instance_1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let instance;

    	onMount(() => {
    		portalRoot.appendChild(instance);
    	});

    	function portal_element_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			instance = $$value;
    			$$invalidate(0, instance);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [instance, $$scope, slots, portal_element_binding];
    }

    class Portal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance_1, create_fragment$d, safe_not_equal, {});
    	}
    }

    /* core\modal.svelte generated by Svelte v3.29.4 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-134cs7e-style";
    	style.textContent = "modal-wrapper.svelte-134cs7e{position:fixed;top:0px;left:0px;width:100vw;height:100vh;background-color:rgba(0, 0, 0, 0.35);z-index:+100}";
    	append(document.head, style);
    }

    // (29:4) {#if open}
    function create_if_block$1(ctx) {
    	let modal_wrapper;
    	let div;
    	let modal_wrapper_transition;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			modal_wrapper = element("modal-wrapper");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(modal_wrapper, "class", "svelte-134cs7e");
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
    					listen(div, "click", stop_propagation(/*click_handler*/ ctx[3])),
    					listen(modal_wrapper, "click", /*wat*/ ctx[1])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, { duration: 250 }, true);
    				modal_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, { duration: 250 }, false);
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

    // (28:0) <Portal>
    function create_default_slot$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*open*/ ctx[0] && create_if_block$1(ctx);

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
    			if (/*open*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*open*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
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

    function create_fragment$e(ctx) {
    	let portal;
    	let current;

    	portal = new Portal({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(portal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(portal, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const portal_changes = {};

    			if (dirty & /*$$scope, open*/ 17) {
    				portal_changes.$$scope = { dirty, ctx };
    			}

    			portal.$set(portal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(portal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(portal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(portal, detaching);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { open = false } = $$props;
    	const dispatch = createEventDispatcher();

    	const wat = evt => {
    		dispatch("close");
    	};

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [open, wat, slots, click_handler, $$scope];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-134cs7e-style")) add_css$c();
    		init(this, options, instance$c, create_fragment$e, safe_not_equal, { open: 0 });
    	}
    }

    /* core\divider.svelte generated by Svelte v3.29.4 */

    function add_css$d() {
    	var style = element("style");
    	style.id = "svelte-171wxy0-style";
    	style.textContent = "divider.svelte-171wxy0{display:block;height:1px;margin:8px;background-color:var(--text-secondary)}divider.vertical.svelte-171wxy0{width:1px;height:100%;align-self:stretch}list-container>divider.svelte-171wxy0{margin:0px}";
    	append(document.head, style);
    }

    function create_fragment$f(ctx) {
    	let divider;
    	let divider_class_value;

    	return {
    		c() {
    			divider = element("divider");
    			attr(divider, "style", /*style*/ ctx[1]);
    			attr(divider, "class", divider_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-171wxy0"));
    			toggle_class(divider, "vertical", /*vertical*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, divider, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*style*/ 2) {
    				attr(divider, "style", /*style*/ ctx[1]);
    			}

    			if (dirty & /*klass*/ 4 && divider_class_value !== (divider_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-171wxy0"))) {
    				attr(divider, "class", divider_class_value);
    			}

    			if (dirty & /*klass, vertical*/ 5) {
    				toggle_class(divider, "vertical", /*vertical*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(divider);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { vertical = false } = $$props;
    	let { style = "" } = $$props;
    	let { class: klass } = $$props;

    	$$self.$$set = $$props => {
    		if ("vertical" in $$props) $$invalidate(0, vertical = $$props.vertical);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("class" in $$props) $$invalidate(2, klass = $$props.class);
    	};

    	return [vertical, style, klass];
    }

    class Divider extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-171wxy0-style")) add_css$d();
    		init(this, options, instance$d, create_fragment$f, safe_not_equal, { vertical: 0, style: 1, class: 2 });
    	}
    }

    /* core\text.svelte generated by Svelte v3.29.4 */

    function add_css$e() {
    	var style = element("style");
    	style.id = "svelte-f5hqm0-style";
    	style.textContent = ".block.svelte-f5hqm0{display:block}.title.svelte-f5hqm0{display:block;font-size:var(--text-size-title);font-weight:400;margin:8px 0px}.header.svelte-f5hqm0{display:block;font-size:var(--text-size-header);font-weight:400;margin:4px 0px}.secondary.svelte-f5hqm0{color:var(--text-secondary);font-size:var(--text-size-secondary)}";
    	append(document.head, style);
    }

    function create_fragment$g(ctx) {
    	let span;
    	let span_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr(span, "style", /*style*/ ctx[2]);
    			attr(span, "class", span_class_value = "" + (/*variant*/ ctx[0] + " " + /*klass*/ ctx[3] + " svelte-f5hqm0"));
    			toggle_class(span, "block", /*block*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*style*/ 4) {
    				attr(span, "style", /*style*/ ctx[2]);
    			}

    			if (!current || dirty & /*variant, klass*/ 9 && span_class_value !== (span_class_value = "" + (/*variant*/ ctx[0] + " " + /*klass*/ ctx[3] + " svelte-f5hqm0"))) {
    				attr(span, "class", span_class_value);
    			}

    			if (dirty & /*variant, klass, block*/ 11) {
    				toggle_class(span, "block", /*block*/ ctx[1]);
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
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { variant = "" } = $$props;
    	let { block = false } = $$props;
    	let { style } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("variant" in $$props) $$invalidate(0, variant = $$props.variant);
    		if ("block" in $$props) $$invalidate(1, block = $$props.block);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("class" in $$props) $$invalidate(3, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [variant, block, style, klass, $$scope, slots];
    }

    class Text extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-f5hqm0-style")) add_css$e();
    		init(this, options, instance$e, create_fragment$g, safe_not_equal, { variant: 0, block: 1, style: 2, class: 3 });
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.29.4 */

    function add_css$f() {
    	var style = element("style");
    	style.id = "svelte-1mk1kzg-style";
    	style.textContent = "drawer-wrapper.svelte-1mk1kzg{position:absolute;top:0px;left:0px;height:100vh;min-width:5vw;background-color:var(--card-background)}";
    	append(document.head, style);
    }

    // (30:0) <Modal {open} on:close>
    function create_default_slot$2(ctx) {
    	let drawer_wrapper;
    	let drawer_wrapper_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			drawer_wrapper = element("drawer-wrapper");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(drawer_wrapper, "class", "svelte-1mk1kzg");
    		},
    		m(target, anchor) {
    			insert(target, drawer_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(drawer_wrapper, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, /*drawerSlide*/ ctx[1], {}, true);
    				drawer_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, /*drawerSlide*/ ctx[1], {}, false);
    			drawer_wrapper_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(drawer_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && drawer_wrapper_transition) drawer_wrapper_transition.end();
    		}
    	};
    }

    function create_fragment$h(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: /*open*/ ctx[0],
    				$$slots: { default: [create_default_slot$2] },
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
    		p(ctx, [dirty]) {
    			const modal_changes = {};
    			if (dirty & /*open*/ 1) modal_changes.open = /*open*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
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

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { open = false } = $$props;

    	const drawerSlide = (node, options) => {
    		return {
    			delay: 0,
    			duration: 200,
    			css: (t, u) => `
            transform: translateX(-${u * 100}%);
            opacity: ${t};
        `
    		};
    	};

    	function close_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [open, drawerSlide, slots, close_handler, $$scope];
    }

    class Drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1mk1kzg-style")) add_css$f();
    		init(this, options, instance$f, create_fragment$h, safe_not_equal, { open: 0 });
    	}
    }

    /* core\list\content.svelte generated by Svelte v3.29.4 */

    function add_css$g() {
    	var style = element("style");
    	style.id = "svelte-pvgd7u-style";
    	style.textContent = "list-item-content.svelte-pvgd7u{grid-area:content;display:flex;flex-direction:column;justify-content:center;align-items:stretch;grid-area:content;padding:8px}list-item-content.control.svelte-pvgd7u{padding:0px}";
    	append(document.head, style);
    }

    function create_fragment$i(ctx) {
    	let list_item_content;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			list_item_content = element("list-item-content");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(list_item_content, "class", "svelte-pvgd7u");
    			toggle_class(list_item_content, "control", /*control*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_item_content, anchor);

    			if (default_slot) {
    				default_slot.m(list_item_content, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (dirty & /*control*/ 1) {
    				toggle_class(list_item_content, "control", /*control*/ ctx[0]);
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
    			if (detaching) detach(list_item_content);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { control } = $$props;

    	$$self.$$set = $$props => {
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [control, $$scope, slots];
    }

    class Content$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-pvgd7u-style")) add_css$g();
    		init(this, options, instance$g, create_fragment$i, safe_not_equal, { control: 0 });
    	}
    }

    /* core\list\header.svelte generated by Svelte v3.29.4 */

    function add_css$h() {
    	var style = element("style");
    	style.id = "svelte-1nqipxs-style";
    	style.textContent = "list-header.svelte-1nqipxs{display:grid;position:relative;padding:8px;color:var(--text-normal);background-color:var(--control-background);font-weight:500;font-size:var(--text-size-header);border-bottom:2px solid var(--text-normal)}list-header.sticky.svelte-1nqipxs{position:sticky;top:0px;z-index:+5}list-header.primary.svelte-1nqipxs{color:var(--button-primary)}list-header.secondary.svelte-1nqipxs{color:var(--button-secondary)}list-header.danger.svelte-1nqipxs{color:var(--button-danger)}";
    	append(document.head, style);
    }

    function create_fragment$j(ctx) {
    	let list_header;
    	let list_header_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			list_header = element("list-header");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(list_header, "class", list_header_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-1nqipxs"));
    			toggle_class(list_header, "sticky", /*sticky*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_header, anchor);

    			if (default_slot) {
    				default_slot.m(list_header, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*color*/ 2 && list_header_class_value !== (list_header_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-1nqipxs"))) {
    				set_custom_element_data(list_header, "class", list_header_class_value);
    			}

    			if (dirty & /*color, sticky*/ 3) {
    				toggle_class(list_header, "sticky", /*sticky*/ ctx[0]);
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
    			if (detaching) detach(list_header);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { color = "default" } = $$props;

    	$$self.$$set = $$props => {
    		if ("sticky" in $$props) $$invalidate(0, sticky = $$props.sticky);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [sticky, color, $$scope, slots];
    }

    class Header extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1nqipxs-style")) add_css$h();
    		init(this, options, instance$h, create_fragment$j, safe_not_equal, { sticky: 0, color: 1 });
    	}
    }

    /* core\list\item.svelte generated by Svelte v3.29.4 */

    function add_css$i() {
    	var style = element("style");
    	style.id = "svelte-cy0409-style";
    	style.textContent = "list-item.svelte-cy0409{display:grid;position:relative;overflow:hidden;padding:12px 16px;color:var(--text-normal);grid-template-areas:\"start-adornment content end-adornment\"\r\n    ;grid-template-columns:auto 1fr auto}list-item.clickable.svelte-cy0409{cursor:pointer;user-select:none}a.svelte-cy0409{position:absolute;top:0px;left:0px;bottom:0px;right:0px;opacity:0}";
    	append(document.head, style);
    }

    // (41:4) {#if clickable}
    function create_if_block_1(ctx) {
    	let ripple;
    	let current;
    	ripple = new Ripple({});

    	return {
    		c() {
    			create_component(ripple.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(ripple, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(ripple, detaching);
    		}
    	};
    }

    // (44:4) {#if href}
    function create_if_block$2(ctx) {
    	let a;
    	let t;

    	return {
    		c() {
    			a = element("a");
    			t = text(/*href*/ ctx[1]);
    			attr(a, "href", /*href*/ ctx[1]);
    			attr(a, "target", /*target*/ ctx[2]);
    			attr(a, "class", "svelte-cy0409");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*href*/ 2) set_data(t, /*href*/ ctx[1]);

    			if (dirty & /*href*/ 2) {
    				attr(a, "href", /*href*/ ctx[1]);
    			}

    			if (dirty & /*target*/ 4) {
    				attr(a, "target", /*target*/ ctx[2]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let list_item;
    	let t0;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	let if_block0 = /*clickable*/ ctx[0] && create_if_block_1();
    	let if_block1 = /*href*/ ctx[1] && create_if_block$2(ctx);

    	return {
    		c() {
    			list_item = element("list-item");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			set_custom_element_data(list_item, "class", "svelte-cy0409");
    			toggle_class(list_item, "clickable", /*clickable*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);

    			if (default_slot) {
    				default_slot.m(list_item, null);
    			}

    			append(list_item, t0);
    			if (if_block0) if_block0.m(list_item, null);
    			append(list_item, t1);
    			if (if_block1) if_block1.m(list_item, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(list_item, "click", /*click_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (/*clickable*/ ctx[0]) {
    				if (if_block0) {
    					if (dirty & /*clickable*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(list_item, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*href*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(list_item, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*clickable*/ 1) {
    				toggle_class(list_item, "clickable", /*clickable*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { clickable } = $$props;
    	let { href = null } = $$props;
    	let { target = "_blank" } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("clickable" in $$props) $$invalidate(0, clickable = $$props.clickable);
    		if ("href" in $$props) $$invalidate(1, href = $$props.href);
    		if ("target" in $$props) $$invalidate(2, target = $$props.target);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [clickable, href, target, $$scope, slots, click_handler];
    }

    class Item extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-cy0409-style")) add_css$i();
    		init(this, options, instance$i, create_fragment$k, safe_not_equal, { clickable: 0, href: 1, target: 2 });
    	}
    }

    /* core\list.svelte generated by Svelte v3.29.4 */

    function add_css$j() {
    	var style = element("style");
    	style.id = "svelte-dk8009-style";
    	style.textContent = "list-container.svelte-dk8009{display:grid;grid-template-columns:1fr;overflow:auto}";
    	append(document.head, style);
    }

    function create_fragment$l(ctx) {
    	let list_container;
    	let list_container_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	return {
    		c() {
    			list_container = element("list-container");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(list_container, "class", list_container_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-dk8009"));
    			set_custom_element_data(list_container, "style", /*styleText*/ ctx[2]);
    			toggle_class(list_container, "compact", /*compact*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_container, anchor);

    			if (default_slot) {
    				default_slot.m(list_container, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 128) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 2 && list_container_class_value !== (list_container_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-dk8009"))) {
    				set_custom_element_data(list_container, "class", list_container_class_value);
    			}

    			if (!current || dirty & /*styleText*/ 4) {
    				set_custom_element_data(list_container, "style", /*styleText*/ ctx[2]);
    			}

    			if (dirty & /*klass, compact*/ 3) {
    				toggle_class(list_container, "compact", /*compact*/ ctx[0]);
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
    			if (detaching) detach(list_container);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { items } = $$props;
    	let { clickable } = $$props;
    	let { height } = $$props;
    	let { compact } = $$props;
    	let { style = "" } = $$props;
    	let { class: klass = "" } = $$props;
    	const dispatch = createEventDispatcher();

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    		if ("clickable" in $$props) $$invalidate(4, clickable = $$props.clickable);
    		if ("height" in $$props) $$invalidate(5, height = $$props.height);
    		if ("compact" in $$props) $$invalidate(0, compact = $$props.compact);
    		if ("style" in $$props) $$invalidate(6, style = $$props.style);
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	let styleText;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*height, style*/ 96) {
    			 $$invalidate(2, styleText = height ? `height: ${height}; ${style}` : style);
    		}
    	};

    	return [compact, klass, styleText, items, clickable, height, style, $$scope, slots];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-dk8009-style")) add_css$j();

    		init(this, options, instance$j, create_fragment$l, safe_not_equal, {
    			items: 3,
    			clickable: 4,
    			height: 5,
    			compact: 0,
    			style: 6,
    			class: 1
    		});
    	}
    }

    /* core\control.svelte generated by Svelte v3.29.4 */

    function add_css$k() {
    	var style = element("style");
    	style.id = "svelte-83t8bu-style";
    	style.textContent = "control-component.svelte-83t8bu.svelte-83t8bu{display:inline-grid;position:relative;z-index:+0}control-content.svelte-83t8bu.svelte-83t8bu{position:relative;display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment control end-adornment\"\r\n        ;padding:13px 4px 4px 4px}fieldset.svelte-83t8bu.svelte-83t8bu{position:absolute;top:0px;left:0px;right:0px;bottom:0px;z-index:-1}.flat.svelte-83t8bu fieldset.svelte-83t8bu{border-radius:0px;border-width:0px;border-bottom:2px solid var(--control-border)}.outline.svelte-83t8bu fieldset.svelte-83t8bu{border:1px solid var(--control-border);border-radius:4px}legend.svelte-83t8bu.svelte-83t8bu{font-size:12px;height:13px}legend.svelte-83t8bu.svelte-83t8bu:empty{padding:0px}fieldset.error.svelte-83t8bu.svelte-83t8bu{border-color:var(--control-border-error)}control-content.svelte-83t8bu>*:focus ~ fieldset:not(.error){border-color:var(--control-border-focus)}control-content.svelte-83t8bu>*:focus ~ fieldset > legend{color:var(--control-border-focus)}info-label.svelte-83t8bu.svelte-83t8bu{font-size:13px;padding-left:12px}info-label.error.svelte-83t8bu.svelte-83t8bu{color:var(--control-border-error)}";
    	append(document.head, style);
    }

    function create_fragment$m(ctx) {
    	let control_component;
    	let control_content;
    	let t0;
    	let fieldset;
    	let legend;
    	let t1;
    	let t2;
    	let info_label0;
    	let t3;
    	let t4;
    	let info_label1;
    	let t5;
    	let control_component_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			control_component = element("control-component");
    			control_content = element("control-content");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			fieldset = element("fieldset");
    			legend = element("legend");
    			t1 = text(/*label*/ ctx[1]);
    			t2 = space();
    			info_label0 = element("info-label");
    			t3 = text(/*info*/ ctx[2]);
    			t4 = space();
    			info_label1 = element("info-label");
    			t5 = text(/*error*/ ctx[0]);
    			attr(legend, "style", /*labelStyle*/ ctx[6]);
    			attr(legend, "class", "svelte-83t8bu");
    			attr(fieldset, "style", /*borderStyle*/ ctx[7]);
    			attr(fieldset, "class", "svelte-83t8bu");
    			toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			set_custom_element_data(control_content, "class", "svelte-83t8bu");
    			set_custom_element_data(info_label0, "class", "svelte-83t8bu");
    			set_custom_element_data(info_label1, "class", "error svelte-83t8bu");
    			set_custom_element_data(control_component, "type", /*type*/ ctx[3]);
    			set_custom_element_data(control_component, "style", /*style*/ ctx[5]);
    			set_custom_element_data(control_component, "class", control_component_class_value = "" + (/*variant*/ ctx[4] + " " + /*klass*/ ctx[8] + " svelte-83t8bu"));
    		},
    		m(target, anchor) {
    			insert(target, control_component, anchor);
    			append(control_component, control_content);

    			if (default_slot) {
    				default_slot.m(control_content, null);
    			}

    			append(control_content, t0);
    			append(control_content, fieldset);
    			append(fieldset, legend);
    			append(legend, t1);
    			append(control_component, t2);
    			append(control_component, info_label0);
    			append(info_label0, t3);
    			append(control_component, t4);
    			append(control_component, info_label1);
    			append(info_label1, t5);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 512) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*label*/ 2) set_data(t1, /*label*/ ctx[1]);

    			if (!current || dirty & /*labelStyle*/ 64) {
    				attr(legend, "style", /*labelStyle*/ ctx[6]);
    			}

    			if (!current || dirty & /*borderStyle*/ 128) {
    				attr(fieldset, "style", /*borderStyle*/ ctx[7]);
    			}

    			if (dirty & /*error*/ 1) {
    				toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			}

    			if (!current || dirty & /*info*/ 4) set_data(t3, /*info*/ ctx[2]);
    			if (!current || dirty & /*error*/ 1) set_data(t5, /*error*/ ctx[0]);

    			if (!current || dirty & /*type*/ 8) {
    				set_custom_element_data(control_component, "type", /*type*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 32) {
    				set_custom_element_data(control_component, "style", /*style*/ ctx[5]);
    			}

    			if (!current || dirty & /*variant, klass*/ 272 && control_component_class_value !== (control_component_class_value = "" + (/*variant*/ ctx[4] + " " + /*klass*/ ctx[8] + " svelte-83t8bu"))) {
    				set_custom_element_data(control_component, "class", control_component_class_value);
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
    			if (detaching) detach(control_component);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { error = "" } = $$props;
    	let { label = "" } = $$props;
    	let { info = "" } = $$props;
    	let { type = "untyped" } = $$props;
    	let { variant = "flat" } = $$props;
    	let { style = "" } = $$props;
    	let { labelStyle = "" } = $$props;
    	let { borderStyle = "" } = $$props;
    	let { klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("info" in $$props) $$invalidate(2, info = $$props.info);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("variant" in $$props) $$invalidate(4, variant = $$props.variant);
    		if ("style" in $$props) $$invalidate(5, style = $$props.style);
    		if ("labelStyle" in $$props) $$invalidate(6, labelStyle = $$props.labelStyle);
    		if ("borderStyle" in $$props) $$invalidate(7, borderStyle = $$props.borderStyle);
    		if ("klass" in $$props) $$invalidate(8, klass = $$props.klass);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	return [
    		error,
    		label,
    		info,
    		type,
    		variant,
    		style,
    		labelStyle,
    		borderStyle,
    		klass,
    		$$scope,
    		slots
    	];
    }

    class Control extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-83t8bu-style")) add_css$k();

    		init(this, options, instance$k, create_fragment$m, safe_not_equal, {
    			error: 0,
    			label: 1,
    			info: 2,
    			type: 3,
    			variant: 4,
    			style: 5,
    			labelStyle: 6,
    			borderStyle: 7,
    			klass: 8
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
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
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* core\tabs.svelte generated by Svelte v3.29.4 */

    function create_fragment$n(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

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
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
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

    const tabContext = {};

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { selectedTab = null } = $$props;
    	const currentTab = writable(selectedTab);
    	setContext(tabContext, currentTab);
    	onMount(() => currentTab.subscribe(next => $$invalidate(0, selectedTab = next)));

    	$$self.$$set = $$props => {
    		if ("selectedTab" in $$props) $$invalidate(0, selectedTab = $$props.selectedTab);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedTab*/ 1) {
    			 currentTab.set(selectedTab);
    		}
    	};

    	return [selectedTab, $$scope, slots];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$l, create_fragment$n, safe_not_equal, { selectedTab: 0 });
    	}
    }

    /* core\tabs\label.svelte generated by Svelte v3.29.4 */

    function add_css$l() {
    	var style = element("style");
    	style.id = "svelte-c06pzi-style";
    	style.textContent = "tab-label.svelte-c06pzi{position:relative;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;border-bottom:2px solid transparent;flex-grow:1;flex-basis:0}tab-label.active.svelte-c06pzi{color:var(--primary);border-bottom-color:var(--primary)}.vertical tab-label.svelte-c06pzi{border-bottom:1px solid var(--text-secondary);border-right:4px solid transparent}.vertical tab-label.active.svelte-c06pzi{border-right-color:var(--primary)}";
    	append(document.head, style);
    }

    function create_fragment$o(ctx) {
    	let tab_label;
    	let t;
    	let ripple;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	ripple = new Ripple({});

    	return {
    		c() {
    			tab_label = element("tab-label");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(tab_label, "class", "svelte-c06pzi");
    			toggle_class(tab_label, "active", /*$currentTab*/ ctx[1] === /*value*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, tab_label, anchor);

    			if (default_slot) {
    				default_slot.m(tab_label, null);
    			}

    			append(tab_label, t);
    			mount_component(ripple, tab_label, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(tab_label, "click", /*changeTab*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (dirty & /*$currentTab, value*/ 3) {
    				toggle_class(tab_label, "active", /*$currentTab*/ ctx[1] === /*value*/ ctx[0]);
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
    			if (detaching) detach(tab_label);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let $currentTab;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { value } = $$props;
    	const currentTab = getContext(tabContext);
    	component_subscribe($$self, currentTab, value => $$invalidate(1, $currentTab = value));
    	const changeTab = () => currentTab.set(value);

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [value, $currentTab, currentTab, changeTab, $$scope, slots];
    }

    class Label extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-c06pzi-style")) add_css$l();
    		init(this, options, instance$m, create_fragment$o, safe_not_equal, { value: 0 });
    	}
    }

    /* core\tabs\list.svelte generated by Svelte v3.29.4 */

    function add_css$m() {
    	var style = element("style");
    	style.id = "svelte-1y8hym1-style";
    	style.textContent = "tab-list.svelte-1y8hym1{grid-area:label;display:flex;background-color:var(--control-background);box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25);z-index:+5}tab-list.vertical.svelte-1y8hym1{flex-direction:column;align-content:stretch}";
    	append(document.head, style);
    }

    function create_fragment$p(ctx) {
    	let tab_list;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			tab_list = element("tab-list");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(tab_list, "class", "svelte-1y8hym1");
    			toggle_class(tab_list, "vertical", /*vertical*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, tab_list, anchor);

    			if (default_slot) {
    				default_slot.m(tab_list, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (dirty & /*vertical*/ 1) {
    				toggle_class(tab_list, "vertical", /*vertical*/ ctx[0]);
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
    			if (detaching) detach(tab_list);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { vertical = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("vertical" in $$props) $$invalidate(0, vertical = $$props.vertical);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [vertical, $$scope, slots];
    }

    class List$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1y8hym1-style")) add_css$m();
    		init(this, options, instance$n, create_fragment$p, safe_not_equal, { vertical: 0 });
    	}
    }

    /* core\tabs\panel.svelte generated by Svelte v3.29.4 */

    function add_css$n() {
    	var style = element("style");
    	style.id = "svelte-1fcwp5r-style";
    	style.textContent = "tab-panel.svelte-1fcwp5r{display:none;grid-area:panel}tab-panel.active.svelte-1fcwp5r{display:block}";
    	append(document.head, style);
    }

    function create_fragment$q(ctx) {
    	let tab_panel;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			tab_panel = element("tab-panel");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(tab_panel, "class", "svelte-1fcwp5r");
    			toggle_class(tab_panel, "active", /*$currentTab*/ ctx[1] === /*value*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, tab_panel, anchor);

    			if (default_slot) {
    				default_slot.m(tab_panel, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (dirty & /*$currentTab, value*/ 3) {
    				toggle_class(tab_panel, "active", /*$currentTab*/ ctx[1] === /*value*/ ctx[0]);
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
    		}
    	};
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let $currentTab;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { value } = $$props;
    	const currentTab = getContext(tabContext);
    	component_subscribe($$self, currentTab, value => $$invalidate(1, $currentTab = value));

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [value, $currentTab, currentTab, $$scope, slots];
    }

    class Panel extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1fcwp5r-style")) add_css$n();
    		init(this, options, instance$o, create_fragment$q, safe_not_equal, { value: 0 });
    	}
    }

    /* core\text-area.svelte generated by Svelte v3.29.4 */

    function add_css$o() {
    	var style = element("style");
    	style.id = "svelte-c4dmow-style";
    	style.textContent = "textarea.svelte-c4dmow{font-family:var(--font);font-size:var(--text-size);grid-area:control;height:4em;box-sizing:border-box;padding:8px 4px;border-width:0px;background-color:transparent;color:var(--text-normal)}textarea.svelte-c4dmow:focus{outline:none}";
    	append(document.head, style);
    }

    // (57:0) <Control type="text-input" {...controlProps}>
    function create_default_slot$3(ctx) {
    	let textarea;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let textarea_levels = [/*inputProps*/ ctx[3]];
    	let textarea_data = {};

    	for (let i = 0; i < textarea_levels.length; i += 1) {
    		textarea_data = assign(textarea_data, textarea_levels[i]);
    	}

    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[20], null);

    	return {
    		c() {
    			textarea = element("textarea");
    			t = space();
    			if (default_slot) default_slot.c();
    			set_attributes(textarea, textarea_data);
    			toggle_class(textarea, "svelte-c4dmow", true);
    		},
    		m(target, anchor) {
    			insert(target, textarea, anchor);
    			/*textarea_binding*/ ctx[18](textarea);
    			set_input_value(textarea, /*value*/ ctx[0]);
    			insert(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(textarea, "input", /*textarea_input_handler*/ ctx[19]),
    					listen(textarea, "input", /*input_handler*/ ctx[15]),
    					listen(textarea, "focus", /*focus_handler*/ ctx[16]),
    					listen(textarea, "blur", /*blur_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			set_attributes(textarea, textarea_data = get_spread_update(textarea_levels, [dirty & /*inputProps*/ 8 && /*inputProps*/ ctx[3]]));

    			if (dirty & /*value*/ 1) {
    				set_input_value(textarea, /*value*/ ctx[0]);
    			}

    			toggle_class(textarea, "svelte-c4dmow", true);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1048576) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[20], dirty, null, null);
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
    			if (detaching) detach(textarea);
    			/*textarea_binding*/ ctx[18](null);
    			if (detaching) detach(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$r(ctx) {
    	let control;
    	let current;
    	const control_spread_levels = [{ type: "text-input" }, /*controlProps*/ ctx[2]];

    	let control_props = {
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < control_spread_levels.length; i += 1) {
    		control_props = assign(control_props, control_spread_levels[i]);
    	}

    	control = new Control({ props: control_props });

    	return {
    		c() {
    			create_component(control.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const control_changes = (dirty & /*controlProps*/ 4)
    			? get_spread_update(control_spread_levels, [control_spread_levels[0], get_spread_object(/*controlProps*/ ctx[2])])
    			: {};

    			if (dirty & /*$$scope, inputProps, inputElement, value*/ 1048587) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(control, detaching);
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"label","error","info","variant","style","labelStyle","borderStyle","class","value","disabled","focus"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = "" } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant } = $$props;
    	let { style } = $$props;
    	let { labelStyle } = $$props;
    	let { borderStyle } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let inputElement = null;

    	function focus() {
    		inputElement.focus();
    	}

    	

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function textarea_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(1, inputElement);
    		});
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(21, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("label" in $$new_props) $$invalidate(4, label = $$new_props.label);
    		if ("error" in $$new_props) $$invalidate(5, error = $$new_props.error);
    		if ("info" in $$new_props) $$invalidate(6, info = $$new_props.info);
    		if ("variant" in $$new_props) $$invalidate(7, variant = $$new_props.variant);
    		if ("style" in $$new_props) $$invalidate(8, style = $$new_props.style);
    		if ("labelStyle" in $$new_props) $$invalidate(9, labelStyle = $$new_props.labelStyle);
    		if ("borderStyle" in $$new_props) $$invalidate(10, borderStyle = $$new_props.borderStyle);
    		if ("class" in $$new_props) $$invalidate(11, klass = $$new_props.class);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("disabled" in $$new_props) $$invalidate(12, disabled = $$new_props.disabled);
    		if ("$$scope" in $$new_props) $$invalidate(20, $$scope = $$new_props.$$scope);
    	};

    	let controlProps;
    	let inputProps;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, style, labelStyle, borderStyle, variant, disabled, klass*/ 8176) {
    			 $$invalidate(2, controlProps = {
    				label,
    				info,
    				error,
    				style,
    				labelStyle,
    				borderStyle,
    				variant,
    				disabled,
    				klass
    			});
    		}

    		 $$invalidate(3, inputProps = { disabled, ...$$restProps });
    	};

    	return [
    		value,
    		inputElement,
    		controlProps,
    		inputProps,
    		label,
    		error,
    		info,
    		variant,
    		style,
    		labelStyle,
    		borderStyle,
    		klass,
    		disabled,
    		focus,
    		slots,
    		input_handler,
    		focus_handler,
    		blur_handler,
    		textarea_binding,
    		textarea_input_handler,
    		$$scope
    	];
    }

    class Text_area extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-c4dmow-style")) add_css$o();

    		init(this, options, instance$p, create_fragment$r, safe_not_equal, {
    			label: 4,
    			error: 5,
    			info: 6,
    			variant: 7,
    			style: 8,
    			labelStyle: 9,
    			borderStyle: 10,
    			class: 11,
    			value: 0,
    			disabled: 12,
    			focus: 13
    		});
    	}

    	get focus() {
    		return this.$$.ctx[13];
    	}
    }

    /* core\text-input.svelte generated by Svelte v3.29.4 */

    function add_css$p() {
    	var style = element("style");
    	style.id = "svelte-1o34zj8-style";
    	style.textContent = "input.svelte-1o34zj8{font-family:var(--font);font-size:var(--text-size);grid-area:control;height:40px;box-sizing:border-box;padding:8px 4px;border-width:0px;background-color:transparent;color:var(--text-normal)}input.svelte-1o34zj8:focus{outline:none}";
    	append(document.head, style);
    }

    // (59:0) <Control type="text-input" {...controlProps}>
    function create_default_slot$4(ctx) {
    	let input;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let input_levels = [/*inputProps*/ ctx[3]];
    	let input_data = {};

    	for (let i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const default_slot_template = /*#slots*/ ctx[15].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[21], null);

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			if (default_slot) default_slot.c();
    			set_attributes(input, input_data);
    			toggle_class(input, "svelte-1o34zj8", true);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			/*input_binding*/ ctx[19](input);
    			set_input_value(input, /*value*/ ctx[0]);
    			insert(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[20]),
    					listen(input, "input", /*input_handler*/ ctx[16]),
    					listen(input, "focus", /*focus_handler*/ ctx[17]),
    					listen(input, "blur", /*blur_handler*/ ctx[18])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*inputProps*/ 8 && /*inputProps*/ ctx[3]]));

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			toggle_class(input, "svelte-1o34zj8", true);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2097152) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[21], dirty, null, null);
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
    			if (detaching) detach(input);
    			/*input_binding*/ ctx[19](null);
    			if (detaching) detach(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$s(ctx) {
    	let control;
    	let current;
    	const control_spread_levels = [{ type: "text-input" }, /*controlProps*/ ctx[2]];

    	let control_props = {
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < control_spread_levels.length; i += 1) {
    		control_props = assign(control_props, control_spread_levels[i]);
    	}

    	control = new Control({ props: control_props });

    	return {
    		c() {
    			create_component(control.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const control_changes = (dirty & /*controlProps*/ 4)
    			? get_spread_update(control_spread_levels, [control_spread_levels[0], get_spread_object(/*controlProps*/ ctx[2])])
    			: {};

    			if (dirty & /*$$scope, inputProps, inputElement, value*/ 2097163) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(control, detaching);
    		}
    	};
    }

    function instance$q($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"label","error","info","variant","style","labelStyle","borderStyle","class","value","disabled","type","focus"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = "" } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant } = $$props;
    	let { style } = $$props;
    	let { labelStyle } = $$props;
    	let { borderStyle } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { type = "text" } = $$props;
    	let inputElement = null;

    	function focus() {
    		inputElement.focus();
    	}

    	

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(1, inputElement);
    		});
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(22, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("label" in $$new_props) $$invalidate(4, label = $$new_props.label);
    		if ("error" in $$new_props) $$invalidate(5, error = $$new_props.error);
    		if ("info" in $$new_props) $$invalidate(6, info = $$new_props.info);
    		if ("variant" in $$new_props) $$invalidate(7, variant = $$new_props.variant);
    		if ("style" in $$new_props) $$invalidate(8, style = $$new_props.style);
    		if ("labelStyle" in $$new_props) $$invalidate(9, labelStyle = $$new_props.labelStyle);
    		if ("borderStyle" in $$new_props) $$invalidate(10, borderStyle = $$new_props.borderStyle);
    		if ("class" in $$new_props) $$invalidate(11, klass = $$new_props.class);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("disabled" in $$new_props) $$invalidate(12, disabled = $$new_props.disabled);
    		if ("type" in $$new_props) $$invalidate(13, type = $$new_props.type);
    		if ("$$scope" in $$new_props) $$invalidate(21, $$scope = $$new_props.$$scope);
    	};

    	let controlProps;
    	let inputProps;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, style, labelStyle, borderStyle, variant, disabled, klass*/ 8176) {
    			 $$invalidate(2, controlProps = {
    				label,
    				info,
    				error,
    				style,
    				labelStyle,
    				borderStyle,
    				variant,
    				disabled,
    				klass
    			});
    		}

    		 $$invalidate(3, inputProps = { type, disabled, ...$$restProps });
    	};

    	return [
    		value,
    		inputElement,
    		controlProps,
    		inputProps,
    		label,
    		error,
    		info,
    		variant,
    		style,
    		labelStyle,
    		borderStyle,
    		klass,
    		disabled,
    		type,
    		focus,
    		slots,
    		input_handler,
    		focus_handler,
    		blur_handler,
    		input_binding,
    		input_input_handler,
    		$$scope
    	];
    }

    class Text_input extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1o34zj8-style")) add_css$p();

    		init(this, options, instance$q, create_fragment$s, safe_not_equal, {
    			label: 4,
    			error: 5,
    			info: 6,
    			variant: 7,
    			style: 8,
    			labelStyle: 9,
    			borderStyle: 10,
    			class: 11,
    			value: 0,
    			disabled: 12,
    			type: 13,
    			focus: 14
    		});
    	}

    	get focus() {
    		return this.$$.ctx[14];
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.29.4 */

    function create_fragment$t(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
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
            --font: Inconsolata;
            --background: #161616;
            --background-layer: #333333;
            --layer-border-width: 1px;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #00aaff;
            --primary-ripple: #00aaff60;
            --secondary: #2fbc2f;
            --secondary-ripple: #2fbc2f60;
            --danger: #df5348;
            --danger-ripple: #df534860;

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
        }
    `;

    	return [theme];
    }

    class Dark extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$r, create_fragment$t, safe_not_equal, {});
    	}
    }

    /* core\theme\light.svelte generated by Svelte v3.29.4 */

    function create_fragment$u(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
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

    function instance$s($$self) {
    	const theme = css`
        body {
            --font: Roboto;
            --background: #e9e9e9;
            --background-layer: #ffffff;
            --layer-border-width: 0px;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #1d62d5;
            --primary-ripple: #1d62d560;
            --secondary: #128f12;
            --secondary-ripple: #128f1260;
            --danger: #F44336;
            --danger-ripple: #F4433660;

            --text-normal: var(--text-dark);
            --text-secondary: #505050;
            --text-invert: var(--text-light);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-dark);
            --ripple-invert: var(--ripple-light);
        }
    `;

    	return [theme];
    }

    class Light extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$s, create_fragment$u, safe_not_equal, {});
    	}
    }

    /* demo\src\components\props.svelte generated by Svelte v3.29.4 */

    function add_css$q() {
    	var style = element("style");
    	style.id = "svelte-1h6wm8b-style";
    	style.textContent = "prop-entry.svelte-1h6wm8b{display:grid;grid-template-areas:\"name type\"\r\n            \"name desc\"\r\n        ;grid-template-columns:min-content auto}prop-entry.svelte-1h6wm8b:nth-child(2n + 1){background-color:var(--control-background)}prop-name.svelte-1h6wm8b,prop-type.svelte-1h6wm8b,prop-description.svelte-1h6wm8b,prop-default.svelte-1h6wm8b{display:flex;align-items:center}prop-name.svelte-1h6wm8b{grid-area:name;padding:8px;font-size:var(--text-header);font-weight:700}prop-type.svelte-1h6wm8b{grid-area:type;padding:8px;font-style:italic}prop-description.svelte-1h6wm8b{grid-area:desc;padding:8px}prop-default.svelte-1h6wm8b:empty{display:none}prop-default.svelte-1h6wm8b::before{content:\"Default: \"}";
    	append(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i][0];
    	child_ctx[3] = list[i][1];
    	return child_ctx;
    }

    // (54:8) <Text variant="header">
    function create_default_slot_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Component Props");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (57:8) {#each entries as [name, info] (name)}
    function create_each_block$1(key_1, ctx) {
    	let prop_entry;
    	let prop_name;
    	let t0_value = /*name*/ ctx[2] + "";
    	let t0;
    	let t1;
    	let prop_type;
    	let t2_value = /*info*/ ctx[3].type + "";
    	let t2;
    	let t3;
    	let prop_default;
    	let t4_value = (/*info*/ ctx[3].defaultValue ?? "") + "";
    	let t4;
    	let t5;
    	let prop_description;
    	let t6_value = /*info*/ ctx[3].desc + "";
    	let t6;
    	let t7;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			prop_entry = element("prop-entry");
    			prop_name = element("prop-name");
    			t0 = text(t0_value);
    			t1 = space();
    			prop_type = element("prop-type");
    			t2 = text(t2_value);
    			t3 = space();
    			prop_default = element("prop-default");
    			t4 = text(t4_value);
    			t5 = space();
    			prop_description = element("prop-description");
    			t6 = text(t6_value);
    			t7 = space();
    			set_custom_element_data(prop_name, "class", "svelte-1h6wm8b");
    			set_custom_element_data(prop_default, "class", "svelte-1h6wm8b");
    			set_custom_element_data(prop_type, "class", "svelte-1h6wm8b");
    			set_custom_element_data(prop_description, "class", "svelte-1h6wm8b");
    			set_custom_element_data(prop_entry, "class", "svelte-1h6wm8b");
    			this.first = prop_entry;
    		},
    		m(target, anchor) {
    			insert(target, prop_entry, anchor);
    			append(prop_entry, prop_name);
    			append(prop_name, t0);
    			append(prop_entry, t1);
    			append(prop_entry, prop_type);
    			append(prop_type, t2);
    			append(prop_type, t3);
    			append(prop_type, prop_default);
    			append(prop_default, t4);
    			append(prop_entry, t5);
    			append(prop_entry, prop_description);
    			append(prop_description, t6);
    			append(prop_entry, t7);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*entries*/ 1 && t0_value !== (t0_value = /*name*/ ctx[2] + "")) set_data(t0, t0_value);
    			if (dirty & /*entries*/ 1 && t2_value !== (t2_value = /*info*/ ctx[3].type + "")) set_data(t2, t2_value);
    			if (dirty & /*entries*/ 1 && t4_value !== (t4_value = (/*info*/ ctx[3].defaultValue ?? "") + "")) set_data(t4, t4_value);
    			if (dirty & /*entries*/ 1 && t6_value !== (t6_value = /*info*/ ctx[3].desc + "")) set_data(t6, t6_value);
    		},
    		d(detaching) {
    			if (detaching) detach(prop_entry);
    		}
    	};
    }

    // (53:4) <CardContent>
    function create_default_slot_1$1(ctx) {
    	let text_1;
    	let t;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "header",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*entries*/ ctx[0];
    	const get_key = ctx => /*name*/ ctx[2];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);

    			if (dirty & /*entries*/ 1) {
    				const each_value = /*entries*/ ctx[0];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block$1, each_1_anchor, get_each_context$1);
    			}
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
    			if (detaching) detach(t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (52:0) <Card>
    function create_default_slot$5(ctx) {
    	let cardcontent;
    	let current;

    	cardcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent_changes = {};

    			if (dirty & /*$$scope, entries*/ 65) {
    				cardcontent_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent.$set(cardcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent, detaching);
    		}
    	};
    }

    function create_fragment$v(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, entries*/ 65) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let { props } = $$props;

    	$$self.$$set = $$props => {
    		if ("props" in $$props) $$invalidate(1, props = $$props.props);
    	};

    	let entries;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*props*/ 2) {
    			 $$invalidate(0, entries = Object.entries(props));
    		}
    	};

    	return [entries, props];
    }

    class Props extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1h6wm8b-style")) add_css$q();
    		init(this, options, instance$t, create_fragment$v, safe_not_equal, { props: 1 });
    	}
    }

    /* demo\src\components\app-bar.svelte generated by Svelte v3.29.4 */

    function create_default_slot_8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("App Bar");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (40:16) <Button round="40px" fab>
    function create_default_slot_7(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "menu", size: "22px" } });

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

    // (39:12) <Adornment position="start">
    function create_default_slot_6(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				round: "40px",
    				fab: true,
    				$$slots: { default: [create_default_slot_7] },
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

    			if (dirty & /*$$scope*/ 2) {
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

    // (46:16) <Button round="40px" fab>
    function create_default_slot_5(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "alarm", size: "22px" } });

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

    // (49:16) <Button round="40px" fab>
    function create_default_slot_4(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { name: "account_circle", size: "22px" }
    		});

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

    // (45:12) <Adornment position="end">
    function create_default_slot_3(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				round: "40px",
    				fab: true,
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				round: "40px",
    				fab: true,
    				$$slots: { default: [create_default_slot_4] },
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

    			if (dirty & /*$$scope*/ 2) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 2) {
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

    // (34:8) <AppBar flow>
    function create_default_slot_2$1(ctx) {
    	let app_title;
    	let t1;
    	let adornment0;
    	let t2;
    	let adornment1;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			app_title = element("app-title");
    			app_title.textContent = "Title";
    			t1 = space();
    			create_component(adornment0.$$.fragment);
    			t2 = space();
    			create_component(adornment1.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, app_title, anchor);
    			insert(target, t1, anchor);
    			mount_component(adornment0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(adornment1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment0_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				adornment1_changes.$$scope = { dirty, ctx };
    			}

    			adornment1.$set(adornment1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment0.$$.fragment, local);
    			transition_in(adornment1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment0.$$.fragment, local);
    			transition_out(adornment1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(app_title);
    			if (detaching) detach(t1);
    			destroy_component(adornment0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(adornment1, detaching);
    		}
    	};
    }

    // (27:4) <CardContent>
    function create_default_slot_1$2(ctx) {
    	let text_1;
    	let t0;
    	let props_1;
    	let t1;
    	let appbar;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "title",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	props_1 = new Props({ props: { props: /*props*/ ctx[0] } });

    	appbar = new App_bar({
    			props: {
    				flow: true,
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t0 = space();
    			create_component(props_1.$$.fragment);
    			t1 = space();
    			create_component(appbar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(props_1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(appbar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const appbar_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(props_1.$$.fragment, local);
    			transition_in(appbar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(props_1.$$.fragment, local);
    			transition_out(appbar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t0);
    			destroy_component(props_1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(appbar, detaching);
    		}
    	};
    }

    // (26:0) <Card>
    function create_default_slot$6(ctx) {
    	let cardcontent;
    	let current;

    	cardcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				cardcontent_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent.$set(cardcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent, detaching);
    		}
    	};
    }

    function create_fragment$w(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$6] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$u($$self) {
    	const props = {
    		flow: {
    			type: "boolean",
    			desc: "If true renders the AppBar as a regular flow item isntead of as a sticky item"
    		}
    	};

    	return [props];
    }

    class App_bar$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$u, create_fragment$w, safe_not_equal, {});
    	}
    }

    /* demo\src\components\button.svelte generated by Svelte v3.29.4 */

    function add_css$r() {
    	var style = element("style");
    	style.id = "svelte-qipcer-style";
    	style.textContent = "grid.svelte-qipcer{display:grid;grid-template-columns:repeat(4, 1fr);grid-gap:4px}";
    	append(document.head, style);
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (29:8) <Text variant="title">
    function create_default_slot_8$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Buttons");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (28:4) <CardContent>
    function create_default_slot_7$1(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "title",
    				$$slots: { default: [create_default_slot_8$1] },
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

    			if (dirty & /*$$scope*/ 4096) {
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

    // (36:16) <Text variant="header">
    function create_default_slot_6$1(ctx) {
    	let t0;
    	let t1_value = /*variant*/ ctx[4] + "";
    	let t1;

    	return {
    		c() {
    			t0 = text("Button Variant: ");
    			t1 = text(t1_value);
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

    // (41:24) <Button                              {variant} {color}                              on:click={showClick(variant, color)}                          >
    function create_default_slot_5$1(ctx) {
    	let t0_value = /*variant*/ ctx[4] + "";
    	let t0;
    	let t1;
    	let t2_value = /*color*/ ctx[7] + "";
    	let t2;

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(t2);
    		}
    	};
    }

    // (40:20) {#each buttonColors as color}
    function create_each_block_2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[4],
    				color: /*color*/ ctx[7],
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*showClick*/ ctx[3](/*variant*/ ctx[4], /*color*/ ctx[7]));

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

    			if (dirty & /*$$scope*/ 4096) {
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

    // (49:24) <Button                              {variant} {color}                              disabled                              on:click={showClick(variant, color)}                          >
    function create_default_slot_4$1(ctx) {
    	let t0;
    	let t1_value = /*variant*/ ctx[4] + "";
    	let t1;
    	let t2;
    	let t3_value = /*color*/ ctx[7] + "";
    	let t3;

    	return {
    		c() {
    			t0 = text("disabled - ");
    			t1 = text(t1_value);
    			t2 = text(" / ");
    			t3 = text(t3_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    			insert(target, t3, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(t2);
    			if (detaching) detach(t3);
    		}
    	};
    }

    // (48:20) {#each buttonColors as color}
    function create_each_block_1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[4],
    				color: /*color*/ ctx[7],
    				disabled: true,
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*showClick*/ ctx[3](/*variant*/ ctx[4], /*color*/ ctx[7]));

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

    			if (dirty & /*$$scope*/ 4096) {
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

    // (35:12) <CardContent>
    function create_default_slot_3$1(ctx) {
    	let text_1;
    	let t0;
    	let grid;
    	let t1;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "header",
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value_2 = /*buttonColors*/ ctx[2];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value_1 = /*buttonColors*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t0 = space();
    			grid = element("grid");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(grid, "class", "svelte-qipcer");
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, grid, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(grid, null);
    			}

    			append(grid, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(grid, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);

    			if (dirty & /*buttonTypes, buttonColors, showClick*/ 14) {
    				each_value_2 = /*buttonColors*/ ctx[2];
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
    						each_blocks_1[i].m(grid, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*buttonTypes, buttonColors, showClick*/ 14) {
    				each_value_1 = /*buttonColors*/ ctx[2];
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
    						each_blocks[i].m(grid, null);
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
    			transition_in(text_1.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
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
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(grid);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (34:8) <Card>
    function create_default_slot_2$2(ctx) {
    	let cardcontent;
    	let current;

    	cardcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				cardcontent_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent.$set(cardcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent, detaching);
    		}
    	};
    }

    // (33:4) {#each buttonTypes as variant}
    function create_each_block$2(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    // (61:4) <CardContent>
    function create_default_slot_1$3(ctx) {
    	let t0;
    	let t1_value = /*clicked*/ ctx[0].join(" / ") + "";
    	let t1;

    	return {
    		c() {
    			t0 = text("Clicked: ");
    			t1 = text(t1_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*clicked*/ 1 && t1_value !== (t1_value = /*clicked*/ ctx[0].join(" / ") + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (27:0) <Card>
    function create_default_slot$7(ctx) {
    	let cardcontent0;
    	let t0;
    	let t1;
    	let cardcontent1;
    	let current;

    	cardcontent0 = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_7$1] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*buttonTypes*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	cardcontent1 = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent0.$$.fragment);
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			create_component(cardcontent1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent0, target, anchor);
    			insert(target, t0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t1, anchor);
    			mount_component(cardcontent1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent0_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				cardcontent0_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent0.$set(cardcontent0_changes);

    			if (dirty & /*buttonColors, buttonTypes, showClick*/ 14) {
    				each_value = /*buttonTypes*/ ctx[1];
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
    						each_blocks[i].m(t1.parentNode, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const cardcontent1_changes = {};

    			if (dirty & /*$$scope, clicked*/ 4097) {
    				cardcontent1_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent1.$set(cardcontent1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent0.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(cardcontent1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent0.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(cardcontent1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent0, detaching);
    			if (detaching) detach(t0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t1);
    			destroy_component(cardcontent1, detaching);
    		}
    	};
    }

    function create_fragment$x(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, clicked*/ 4097) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let clicked = [];
    	const buttonTypes = ["normal", "outline", "fill"];
    	const buttonColors = ["default", "primary", "secondary", "danger"];
    	const showClick = (variant, color) => evt => $$invalidate(0, clicked = [variant, color]);
    	return [clicked, buttonTypes, buttonColors, showClick];
    }

    class Button_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-qipcer-style")) add_css$r();
    		init(this, options, instance$v, create_fragment$x, safe_not_equal, {});
    	}
    }

    /* demo\src\components\chip.svelte generated by Svelte v3.29.4 */

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (26:20) <Adornment position="start">
    function create_default_slot_5$2(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "check" } });

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

    // (25:16) <Chip label={color} {color} clickable on:click={() => console.log(color)}>
    function create_default_slot_4$2(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_5$2] },
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

    			if (dirty & /*$$scope*/ 64) {
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

    // (31:20) <Adornment position="end">
    function create_default_slot_3$2(ctx) {
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

    // (30:16) <Chip label={color} {color} clickable on:click={() => console.log(color)}>
    function create_default_slot_2$3(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_3$2] },
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

    			if (dirty & /*$$scope*/ 64) {
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

    // (21:8) {#each colors as color}
    function create_each_block$3(ctx) {
    	let div;
    	let chip0;
    	let t0;
    	let chip1;
    	let t1;
    	let chip2;
    	let t2;
    	let chip3;
    	let t3;
    	let current;

    	chip0 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3]
    			}
    		});

    	chip1 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3],
    				clickable: true
    			}
    		});

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[1](/*color*/ ctx[3], ...args);
    	}

    	chip2 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3],
    				clickable: true,
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			}
    		});

    	chip2.$on("click", click_handler);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[2](/*color*/ ctx[3], ...args);
    	}

    	chip3 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3],
    				clickable: true,
    				$$slots: { default: [create_default_slot_2$3] },
    				$$scope: { ctx }
    			}
    		});

    	chip3.$on("click", click_handler_1);

    	return {
    		c() {
    			div = element("div");
    			create_component(chip0.$$.fragment);
    			t0 = space();
    			create_component(chip1.$$.fragment);
    			t1 = space();
    			create_component(chip2.$$.fragment);
    			t2 = space();
    			create_component(chip3.$$.fragment);
    			t3 = space();
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(chip0, div, null);
    			append(div, t0);
    			mount_component(chip1, div, null);
    			append(div, t1);
    			mount_component(chip2, div, null);
    			append(div, t2);
    			mount_component(chip3, div, null);
    			append(div, t3);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const chip2_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				chip2_changes.$$scope = { dirty, ctx };
    			}

    			chip2.$set(chip2_changes);
    			const chip3_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				chip3_changes.$$scope = { dirty, ctx };
    			}

    			chip3.$set(chip3_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(chip0.$$.fragment, local);
    			transition_in(chip1.$$.fragment, local);
    			transition_in(chip2.$$.fragment, local);
    			transition_in(chip3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chip0.$$.fragment, local);
    			transition_out(chip1.$$.fragment, local);
    			transition_out(chip2.$$.fragment, local);
    			transition_out(chip3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(chip0);
    			destroy_component(chip1);
    			destroy_component(chip2);
    			destroy_component(chip3);
    		}
    	};
    }

    // (20:4) <CardContent>
    function create_default_slot_1$4(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*colors*/ ctx[0];
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
    			if (dirty & /*colors, console*/ 1) {
    				each_value = /*colors*/ ctx[0];
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

    // (19:0) <Card>
    function create_default_slot$8(ctx) {
    	let cardcontent;
    	let current;

    	cardcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_1$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				cardcontent_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent.$set(cardcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent, detaching);
    		}
    	};
    }

    function create_fragment$y(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$w($$self) {
    	const colors = ["normal", "primary", "secondary", "danger"];
    	const click_handler = color => console.log(color);
    	const click_handler_1 = color => console.log(color);
    	return [colors, click_handler, click_handler_1];
    }

    class Chip_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$w, create_fragment$y, safe_not_equal, {});
    	}
    }

    /* demo\src\components\list.svelte generated by Svelte v3.29.4 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (34:8) <ListHeader color="primary">
    function create_default_slot_14(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Image Avatars");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (39:16) <Adornment position="start">
    function create_default_slot_13(ctx) {
    	let avatar;
    	let current;

    	avatar = new Avatar({
    			props: {
    				image: /*images*/ ctx[1][/*index*/ ctx[5] % 2]
    			}
    		});

    	return {
    		c() {
    			create_component(avatar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(avatar, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(avatar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(avatar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(avatar, detaching);
    		}
    	};
    }

    // (42:16) <ListItemContent>
    function create_default_slot_12(ctx) {
    	let t_value = /*item*/ ctx[3] + "";
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

    // (38:12) <ListItem clickable>
    function create_default_slot_11(ctx) {
    	let adornment;
    	let t;
    	let listitemcontent;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_13] },
    				$$scope: { ctx }
    			}
    		});

    	listitemcontent = new Content$1({
    			props: {
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment.$$.fragment);
    			t = space();
    			create_component(listitemcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment, target, anchor);
    			insert(target, t, anchor);
    			mount_component(listitemcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				adornment_changes.$$scope = { dirty, ctx };
    			}

    			adornment.$set(adornment_changes);
    			const listitemcontent_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitemcontent_changes.$$scope = { dirty, ctx };
    			}

    			listitemcontent.$set(listitemcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment.$$.fragment, local);
    			transition_in(listitemcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment.$$.fragment, local);
    			transition_out(listitemcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment, detaching);
    			if (detaching) detach(t);
    			destroy_component(listitemcontent, detaching);
    		}
    	};
    }

    // (37:8) {#each items as item, index}
    function create_each_block_2$1(ctx) {
    	let listitem;
    	let t;
    	let divider;
    	let current;

    	listitem = new Item({
    			props: {
    				clickable: true,
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			}
    		});

    	divider = new Divider({});

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    			t = space();
    			create_component(divider.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			insert(target, t, anchor);
    			mount_component(divider, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			transition_in(divider.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			transition_out(divider.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    			if (detaching) detach(t);
    			destroy_component(divider, detaching);
    		}
    	};
    }

    // (49:8) <ListHeader color="secondary">
    function create_default_slot_10(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Text Avatars");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (55:20) <Avatar>
    function create_default_slot_9(ctx) {
    	let t_value = /*index*/ ctx[5] * 50 + "";
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

    // (54:16) <Adornment position="start">
    function create_default_slot_8$2(ctx) {
    	let avatar;
    	let current;

    	avatar = new Avatar({
    			props: {
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(avatar.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(avatar, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const avatar_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				avatar_changes.$$scope = { dirty, ctx };
    			}

    			avatar.$set(avatar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(avatar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(avatar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(avatar, detaching);
    		}
    	};
    }

    // (57:16) <ListItemContent>
    function create_default_slot_7$2(ctx) {
    	let t_value = /*item*/ ctx[3] + "";
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

    // (53:12) <ListItem clickable>
    function create_default_slot_6$2(ctx) {
    	let adornment;
    	let t;
    	let listitemcontent;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_8$2] },
    				$$scope: { ctx }
    			}
    		});

    	listitemcontent = new Content$1({
    			props: {
    				$$slots: { default: [create_default_slot_7$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment.$$.fragment);
    			t = space();
    			create_component(listitemcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment, target, anchor);
    			insert(target, t, anchor);
    			mount_component(listitemcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				adornment_changes.$$scope = { dirty, ctx };
    			}

    			adornment.$set(adornment_changes);
    			const listitemcontent_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitemcontent_changes.$$scope = { dirty, ctx };
    			}

    			listitemcontent.$set(listitemcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment.$$.fragment, local);
    			transition_in(listitemcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment.$$.fragment, local);
    			transition_out(listitemcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment, detaching);
    			if (detaching) detach(t);
    			destroy_component(listitemcontent, detaching);
    		}
    	};
    }

    // (52:8) {#each items as item, index}
    function create_each_block_1$1(ctx) {
    	let listitem;
    	let t;
    	let divider;
    	let current;

    	listitem = new Item({
    			props: {
    				clickable: true,
    				$$slots: { default: [create_default_slot_6$2] },
    				$$scope: { ctx }
    			}
    		});

    	divider = new Divider({});

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    			t = space();
    			create_component(divider.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			insert(target, t, anchor);
    			mount_component(divider, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			transition_in(divider.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			transition_out(divider.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    			if (detaching) detach(t);
    			destroy_component(divider, detaching);
    		}
    	};
    }

    // (64:8) <ListHeader>
    function create_default_slot_5$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Checkboxes:");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (70:20) <Checkbox>
    function create_default_slot_4$3(ctx) {
    	let t0;
    	let t1_value = /*item*/ ctx[3] + "";
    	let t1;

    	return {
    		c() {
    			t0 = text("Label: ");
    			t1 = text(t1_value);
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

    // (69:16) <ListItemContent control>
    function create_default_slot_3$3(ctx) {
    	let checkbox;
    	let current;

    	checkbox = new Checkbox({
    			props: {
    				$$slots: { default: [create_default_slot_4$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(checkbox.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(checkbox, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				checkbox_changes.$$scope = { dirty, ctx };
    			}

    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(checkbox, detaching);
    		}
    	};
    }

    // (68:12) <ListItem>
    function create_default_slot_2$4(ctx) {
    	let listitemcontent;
    	let current;

    	listitemcontent = new Content$1({
    			props: {
    				control: true,
    				$$slots: { default: [create_default_slot_3$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitemcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitemcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitemcontent_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitemcontent_changes.$$scope = { dirty, ctx };
    			}

    			listitemcontent.$set(listitemcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitemcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitemcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitemcontent, detaching);
    		}
    	};
    }

    // (67:8) {#each items as item, index}
    function create_each_block$4(ctx) {
    	let listitem;
    	let t;
    	let divider;
    	let current;

    	listitem = new Item({
    			props: {
    				$$slots: { default: [create_default_slot_2$4] },
    				$$scope: { ctx }
    			}
    		});

    	divider = new Divider({});

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    			t = space();
    			create_component(divider.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			insert(target, t, anchor);
    			mount_component(divider, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			transition_in(divider.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			transition_out(divider.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    			if (detaching) detach(t);
    			destroy_component(divider, detaching);
    		}
    	};
    }

    // (33:4) <List>
    function create_default_slot_1$5(ctx) {
    	let listheader0;
    	let t0;
    	let t1;
    	let listheader1;
    	let t2;
    	let t3;
    	let listheader2;
    	let t4;
    	let each2_anchor;
    	let current;

    	listheader0 = new Header({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_14] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value_2 = /*items*/ ctx[0];
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	listheader1 = new Header({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value_1 = /*items*/ ctx[0];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	listheader2 = new Header({
    			props: {
    				$$slots: { default: [create_default_slot_5$3] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*items*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out_2 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(listheader0.$$.fragment);
    			t0 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t1 = space();
    			create_component(listheader1.$$.fragment);
    			t2 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			create_component(listheader2.$$.fragment);
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each2_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(listheader0, target, anchor);
    			insert(target, t0, anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(target, anchor);
    			}

    			insert(target, t1, anchor);
    			mount_component(listheader1, target, anchor);
    			insert(target, t2, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert(target, t3, anchor);
    			mount_component(listheader2, target, anchor);
    			insert(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each2_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listheader0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listheader0_changes.$$scope = { dirty, ctx };
    			}

    			listheader0.$set(listheader0_changes);

    			if (dirty & /*items, images*/ 3) {
    				each_value_2 = /*items*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2$1(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(t1.parentNode, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const listheader1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listheader1_changes.$$scope = { dirty, ctx };
    			}

    			listheader1.$set(listheader1_changes);

    			if (dirty & /*items*/ 1) {
    				each_value_1 = /*items*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(t3.parentNode, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			const listheader2_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listheader2_changes.$$scope = { dirty, ctx };
    			}

    			listheader2.$set(listheader2_changes);

    			if (dirty & /*items*/ 1) {
    				each_value = /*items*/ ctx[0];
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
    						each_blocks[i].m(each2_anchor.parentNode, each2_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_2(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listheader0.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			transition_in(listheader1.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			transition_in(listheader2.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(listheader0.$$.fragment, local);
    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			transition_out(listheader1.$$.fragment, local);
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			transition_out(listheader2.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listheader0, detaching);
    			if (detaching) detach(t0);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach(t1);
    			destroy_component(listheader1, detaching);
    			if (detaching) detach(t2);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(listheader2, detaching);
    			if (detaching) detach(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each2_anchor);
    		}
    	};
    }

    // (32:0) <Card>
    function create_default_slot$9(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				$$slots: { default: [create_default_slot_1$5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
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
    			destroy_component(list, detaching);
    		}
    	};
    }

    function create_fragment$z(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$x($$self) {
    	const items = Array.from({ length: 3 }, (_, i) => `Item ${i + 1}`);

    	const images = [
    		"https://banner2.cleanpng.com/20180411/idq/kisspng-mega-man-universe-mega-man-6-mega-man-battle-netwo-megaman-5acdbe2e8274f1.4622027515234330065344.jpg",
    		"https://art.pixilart.com/8ef4ae1d162cdb9.png"
    	];

    	return [items, images];
    }

    class List_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$x, create_fragment$z, safe_not_equal, {});
    	}
    }

    /* demo\src\components\text-area.svelte generated by Svelte v3.29.4 */

    function add_css$s() {
    	var style = element("style");
    	style.id = "svelte-qk2yqe-style";
    	style.textContent = "layout.svelte-qk2yqe{display:grid;grid-template-columns:1fr;align-items:start}";
    	append(document.head, style);
    }

    // (28:8) <Text variant="title">
    function create_default_slot_4$4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Text Area");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (34:16) <Adornment position="start">
    function create_default_slot_3$4(ctx) {
    	let t0_value = /*value*/ ctx[0].length + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = text(" / 250");
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 1 && t0_value !== (t0_value = /*value*/ ctx[0].length + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (33:12) <TextArea label="Textarea" bind:value>
    function create_default_slot_2$5(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_3$4] },
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

    			if (dirty & /*$$scope, value*/ 9) {
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

    // (27:4) <CardContent>
    function create_default_slot_1$6(ctx) {
    	let text_1;
    	let t;
    	let layout;
    	let textarea;
    	let updating_value;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "title",
    				$$slots: { default: [create_default_slot_4$4] },
    				$$scope: { ctx }
    			}
    		});

    	function textarea_value_binding(value) {
    		/*textarea_value_binding*/ ctx[1].call(null, value);
    	}

    	let textarea_props = {
    		label: "Textarea",
    		$$slots: { default: [create_default_slot_2$5] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textarea_props.value = /*value*/ ctx[0];
    	}

    	textarea = new Text_area({ props: textarea_props });
    	binding_callbacks.push(() => bind(textarea, "value", textarea_value_binding));

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t = space();
    			layout = element("layout");
    			create_component(textarea.$$.fragment);
    			attr(layout, "class", "svelte-qk2yqe");
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t, anchor);
    			insert(target, layout, anchor);
    			mount_component(textarea, layout, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const textarea_changes = {};

    			if (dirty & /*$$scope, value*/ 9) {
    				textarea_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				textarea_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			textarea.$set(textarea_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(textarea.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(textarea.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(layout);
    			destroy_component(textarea);
    		}
    	};
    }

    // (26:0) <Card>
    function create_default_slot$a(ctx) {
    	let cardcontent;
    	let current;

    	cardcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_1$6] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent_changes = {};

    			if (dirty & /*$$scope, value*/ 9) {
    				cardcontent_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent.$set(cardcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent, detaching);
    		}
    	};
    }

    function create_fragment$A(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$a] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, value*/ 9) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let value = "";

    	function textarea_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	return [value, textarea_value_binding];
    }

    class Text_area$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-qk2yqe-style")) add_css$s();
    		init(this, options, instance$y, create_fragment$A, safe_not_equal, {});
    	}
    }

    /* demo\src\components\text-input.svelte generated by Svelte v3.29.4 */

    function add_css$t() {
    	var style = element("style");
    	style.id = "svelte-19yeeqx-style";
    	style.textContent = "layout.svelte-19yeeqx{display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));align-items:start}.line-break{grid-column:1 / -1}";
    	append(document.head, style);
    }

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (37:8) <Text variant="title">
    function create_default_slot_10$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Text Input");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (41:8) <Button on:click={focus} color="primary">
    function create_default_slot_9$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Do the thing!");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (61:20) <Adornment position="start">
    function create_default_slot_8$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("$");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (60:16) <TextInput bind:value label="Start Adornment" {variant} type="search" on:input={console.log}>
    function create_default_slot_7$3(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_8$3] },
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

    			if (dirty & /*$$scope*/ 16384) {
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

    // (66:20) <Adornment position="end">
    function create_default_slot_6$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Lbs");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (65:16) <TextInput bind:value label="End Adornment" {variant}>
    function create_default_slot_5$4(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_6$3] },
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

    			if (dirty & /*$$scope*/ 16384) {
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

    // (74:20) <Adornment position="start">
    function create_default_slot_4$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("$");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (77:20) <Adornment position="end">
    function create_default_slot_3$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Lbs");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (73:16) <TextInput bind:value label="Adornments" {variant} type="number">
    function create_default_slot_2$6(ctx) {
    	let adornment0;
    	let t;
    	let adornment1;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_4$5] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_3$5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment0.$$.fragment);
    			t = space();
    			create_component(adornment1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(adornment1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment0_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				adornment1_changes.$$scope = { dirty, ctx };
    			}

    			adornment1.$set(adornment1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment0.$$.fragment, local);
    			transition_in(adornment1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment0.$$.fragment, local);
    			transition_out(adornment1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment0, detaching);
    			if (detaching) detach(t);
    			destroy_component(adornment1, detaching);
    		}
    	};
    }

    // (47:12) {#each variants as variant}
    function create_each_block$5(ctx) {
    	let textinput0;
    	let updating_value;
    	let t0;
    	let textinput1;
    	let updating_value_1;
    	let t1;
    	let textinput2;
    	let updating_value_2;
    	let t2;
    	let divider0;
    	let t3;
    	let textinput3;
    	let t4;
    	let textinput4;
    	let updating_value_3;
    	let t5;
    	let textinput5;
    	let updating_value_4;
    	let t6;
    	let divider1;
    	let t7;
    	let textinput6;
    	let updating_value_5;
    	let t8;
    	let divider2;
    	let current;

    	function textinput0_value_binding(value) {
    		/*textinput0_value_binding*/ ctx[5].call(null, value);
    	}

    	let textinput0_props = {
    		variant: /*variant*/ ctx[11],
    		placeholder: "Placeholder"
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textinput0_props.value = /*value*/ ctx[0];
    	}

    	textinput0 = new Text_input({ props: textinput0_props });
    	binding_callbacks.push(() => bind(textinput0, "value", textinput0_value_binding));

    	function textinput1_value_binding(value) {
    		/*textinput1_value_binding*/ ctx[6].call(null, value);
    	}

    	let textinput1_props = {
    		label: "Normal",
    		variant: /*variant*/ ctx[11],
    		tabindex: "1"
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textinput1_props.value = /*value*/ ctx[0];
    	}

    	textinput1 = new Text_input({ props: textinput1_props });
    	binding_callbacks.push(() => bind(textinput1, "value", textinput1_value_binding));

    	function textinput2_value_binding(value) {
    		/*textinput2_value_binding*/ ctx[7].call(null, value);
    	}

    	let textinput2_props = {
    		variant: /*variant*/ ctx[11],
    		label: "Information",
    		info: "Some information text goes here"
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textinput2_props.value = /*value*/ ctx[0];
    	}

    	textinput2 = new Text_input({ props: textinput2_props });
    	binding_callbacks.push(() => bind(textinput2, "value", textinput2_value_binding));
    	divider0 = new Divider({ props: { class: "line-break" } });

    	textinput3 = new Text_input({
    			props: {
    				value: /*value*/ ctx[0],
    				label: "Error",
    				error: "wat",
    				variant: /*variant*/ ctx[11]
    			}
    		});

    	textinput3.$on("focus", console.log);

    	function textinput4_value_binding(value) {
    		/*textinput4_value_binding*/ ctx[8].call(null, value);
    	}

    	let textinput4_props = {
    		label: "Start Adornment",
    		variant: /*variant*/ ctx[11],
    		type: "search",
    		$$slots: { default: [create_default_slot_7$3] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textinput4_props.value = /*value*/ ctx[0];
    	}

    	textinput4 = new Text_input({ props: textinput4_props });
    	binding_callbacks.push(() => bind(textinput4, "value", textinput4_value_binding));
    	textinput4.$on("input", console.log);

    	function textinput5_value_binding(value) {
    		/*textinput5_value_binding*/ ctx[9].call(null, value);
    	}

    	let textinput5_props = {
    		label: "End Adornment",
    		variant: /*variant*/ ctx[11],
    		$$slots: { default: [create_default_slot_5$4] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textinput5_props.value = /*value*/ ctx[0];
    	}

    	textinput5 = new Text_input({ props: textinput5_props });
    	binding_callbacks.push(() => bind(textinput5, "value", textinput5_value_binding));
    	divider1 = new Divider({ props: { class: "line-break" } });

    	function textinput6_value_binding(value) {
    		/*textinput6_value_binding*/ ctx[10].call(null, value);
    	}

    	let textinput6_props = {
    		label: "Adornments",
    		variant: /*variant*/ ctx[11],
    		type: "number",
    		$$slots: { default: [create_default_slot_2$6] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		textinput6_props.value = /*value*/ ctx[0];
    	}

    	textinput6 = new Text_input({ props: textinput6_props });
    	binding_callbacks.push(() => bind(textinput6, "value", textinput6_value_binding));
    	divider2 = new Divider({ props: { class: "line-break" } });

    	return {
    		c() {
    			create_component(textinput0.$$.fragment);
    			t0 = space();
    			create_component(textinput1.$$.fragment);
    			t1 = space();
    			create_component(textinput2.$$.fragment);
    			t2 = space();
    			create_component(divider0.$$.fragment);
    			t3 = space();
    			create_component(textinput3.$$.fragment);
    			t4 = space();
    			create_component(textinput4.$$.fragment);
    			t5 = space();
    			create_component(textinput5.$$.fragment);
    			t6 = space();
    			create_component(divider1.$$.fragment);
    			t7 = space();
    			create_component(textinput6.$$.fragment);
    			t8 = space();
    			create_component(divider2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(textinput0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(textinput1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(textinput2, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(divider0, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(textinput3, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(textinput4, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(textinput5, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(divider1, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(textinput6, target, anchor);
    			insert(target, t8, anchor);
    			mount_component(divider2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const textinput0_changes = {};

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				textinput0_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			textinput0.$set(textinput0_changes);
    			const textinput1_changes = {};

    			if (!updating_value_1 && dirty & /*value*/ 1) {
    				updating_value_1 = true;
    				textinput1_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			textinput1.$set(textinput1_changes);
    			const textinput2_changes = {};

    			if (!updating_value_2 && dirty & /*value*/ 1) {
    				updating_value_2 = true;
    				textinput2_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			textinput2.$set(textinput2_changes);
    			const textinput3_changes = {};
    			if (dirty & /*value*/ 1) textinput3_changes.value = /*value*/ ctx[0];
    			textinput3.$set(textinput3_changes);
    			const textinput4_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				textinput4_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_3 && dirty & /*value*/ 1) {
    				updating_value_3 = true;
    				textinput4_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			textinput4.$set(textinput4_changes);
    			const textinput5_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				textinput5_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_4 && dirty & /*value*/ 1) {
    				updating_value_4 = true;
    				textinput5_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			textinput5.$set(textinput5_changes);
    			const textinput6_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				textinput6_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_5 && dirty & /*value*/ 1) {
    				updating_value_5 = true;
    				textinput6_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value_5 = false);
    			}

    			textinput6.$set(textinput6_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			transition_in(divider0.$$.fragment, local);
    			transition_in(textinput3.$$.fragment, local);
    			transition_in(textinput4.$$.fragment, local);
    			transition_in(textinput5.$$.fragment, local);
    			transition_in(divider1.$$.fragment, local);
    			transition_in(textinput6.$$.fragment, local);
    			transition_in(divider2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(divider0.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			transition_out(divider1.$$.fragment, local);
    			transition_out(textinput6.$$.fragment, local);
    			transition_out(divider2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(textinput0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(textinput1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(textinput2, detaching);
    			if (detaching) detach(t2);
    			destroy_component(divider0, detaching);
    			if (detaching) detach(t3);
    			destroy_component(textinput3, detaching);
    			if (detaching) detach(t4);
    			destroy_component(textinput4, detaching);
    			if (detaching) detach(t5);
    			destroy_component(textinput5, detaching);
    			if (detaching) detach(t6);
    			destroy_component(divider1, detaching);
    			if (detaching) detach(t7);
    			destroy_component(textinput6, detaching);
    			if (detaching) detach(t8);
    			destroy_component(divider2, detaching);
    		}
    	};
    }

    // (36:4) <CardContent>
    function create_default_slot_1$7(ctx) {
    	let text_1;
    	let t0;
    	let button;
    	let t1;
    	let textinput;
    	let t2;
    	let layout;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "title",
    				$$slots: { default: [create_default_slot_10$1] },
    				$$scope: { ctx }
    			}
    		});

    	button = new Button({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_9$1] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*focus*/ ctx[3]);
    	let textinput_props = { label: "Focused?" };
    	textinput = new Text_input({ props: textinput_props });
    	/*textinput_binding*/ ctx[4](textinput);
    	let each_value = /*variants*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t0 = space();
    			create_component(button.$$.fragment);
    			t1 = space();
    			create_component(textinput.$$.fragment);
    			t2 = space();
    			layout = element("layout");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(layout, "class", "svelte-19yeeqx");
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(button, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(textinput, target, anchor);
    			insert(target, t2, anchor);
    			insert(target, layout, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(layout, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			const textinput_changes = {};
    			textinput.$set(textinput_changes);

    			if (dirty & /*variants, value, console*/ 5) {
    				each_value = /*variants*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(layout, null);
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
    			transition_in(text_1.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			transition_in(textinput.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(textinput.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t0);
    			destroy_component(button, detaching);
    			if (detaching) detach(t1);
    			/*textinput_binding*/ ctx[4](null);
    			destroy_component(textinput, detaching);
    			if (detaching) detach(t2);
    			if (detaching) detach(layout);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (35:0) <Card>
    function create_default_slot$b(ctx) {
    	let cardcontent;
    	let current;

    	cardcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_1$7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(cardcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(cardcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const cardcontent_changes = {};

    			if (dirty & /*$$scope, value, focusElement*/ 16387) {
    				cardcontent_changes.$$scope = { dirty, ctx };
    			}

    			cardcontent.$set(cardcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cardcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cardcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(cardcontent, detaching);
    		}
    	};
    }

    function create_fragment$B(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$b] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, value, focusElement*/ 16387) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$z($$self, $$props, $$invalidate) {
    	let value = "";
    	const variants = ["flat", "outline"];
    	let focusElement;

    	const focus = () => {
    		focusElement.focus();
    	};

    	function textinput_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			focusElement = $$value;
    			$$invalidate(1, focusElement);
    		});
    	}

    	function textinput0_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function textinput1_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function textinput2_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function textinput4_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function textinput5_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function textinput6_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	return [
    		value,
    		focusElement,
    		variants,
    		focus,
    		textinput_binding,
    		textinput0_value_binding,
    		textinput1_value_binding,
    		textinput2_value_binding,
    		textinput4_value_binding,
    		textinput5_value_binding,
    		textinput6_value_binding
    	];
    }

    class Text_input$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-19yeeqx-style")) add_css$t();
    		init(this, options, instance$z, create_fragment$B, safe_not_equal, {});
    	}
    }

    /* demo\src\app.svelte generated by Svelte v3.29.4 */

    const { document: document_1 } = globals;

    function add_css$u() {
    	var style = element("style");
    	style.id = "svelte-1vuegt6-style";
    	style.textContent = "page-layout.svelte-1vuegt6{display:grid;grid-template-rows:min-content auto}demo-area.svelte-1vuegt6{display:block;width:100%;max-width:1024px;margin:auto}";
    	append(document_1.head, style);
    }

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i][0];
    	child_ctx[12] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (91:12) <Button on:click={openDrawer} round="40px" fab>
    function create_default_slot_8$4(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "menu", size: "22px" } });

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

    // (90:8) <Adornment position="start">
    function create_default_slot_7$4(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				round: "40px",
    				fab: true,
    				$$slots: { default: [create_default_slot_8$4] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*openDrawer*/ ctx[4]);

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

    			if (dirty & /*$$scope*/ 131072) {
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

    // (99:8) <Adornment position="end">
    function create_default_slot_6$4(ctx) {
    	let checkbox;
    	let updating_checked;
    	let current;

    	function checkbox_checked_binding(value) {
    		/*checkbox_checked_binding*/ ctx[7].call(null, value);
    	}

    	let checkbox_props = {
    		uncheckedIcon: "brightness_high",
    		checkedIcon: "brightness_low"
    	};

    	if (/*checked*/ ctx[0] !== void 0) {
    		checkbox_props.checked = /*checked*/ ctx[0];
    	}

    	checkbox = new Checkbox({ props: checkbox_props });
    	binding_callbacks.push(() => bind(checkbox, "checked", checkbox_checked_binding));

    	return {
    		c() {
    			create_component(checkbox.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(checkbox, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};

    			if (!updating_checked && dirty & /*checked*/ 1) {
    				updating_checked = true;
    				checkbox_changes.checked = /*checked*/ ctx[0];
    				add_flush_callback(() => updating_checked = false);
    			}

    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(checkbox, detaching);
    		}
    	};
    }

    // (89:4) <AppBar>
    function create_default_slot_5$5(ctx) {
    	let adornment0;
    	let t0;
    	let app_title;
    	let t2;
    	let adornment1;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_7$4] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_6$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment0.$$.fragment);
    			t0 = space();
    			app_title = element("app-title");
    			app_title.textContent = "Svelte Doric Components";
    			t2 = space();
    			create_component(adornment1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment0, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, app_title, anchor);
    			insert(target, t2, anchor);
    			mount_component(adornment1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment0_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope, checked*/ 131073) {
    				adornment1_changes.$$scope = { dirty, ctx };
    			}

    			adornment1.$set(adornment1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment0.$$.fragment, local);
    			transition_in(adornment1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment0.$$.fragment, local);
    			transition_out(adornment1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment0, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(app_title);
    			if (detaching) detach(t2);
    			destroy_component(adornment1, detaching);
    		}
    	};
    }

    // (113:20) <TabLabel value={demo}>
    function create_default_slot_4$6(ctx) {
    	let t0_value = /*demo*/ ctx[11].replace(/\b\w/g, func) + "";
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

    // (112:16) {#each Object.keys(demos) as demo}
    function create_each_block_1$2(ctx) {
    	let tablabel;
    	let current;

    	tablabel = new Label({
    			props: {
    				value: /*demo*/ ctx[11],
    				$$slots: { default: [create_default_slot_4$6] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tablabel.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablabel, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablabel_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				tablabel_changes.$$scope = { dirty, ctx };
    			}

    			tablabel.$set(tablabel_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablabel.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablabel.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablabel, detaching);
    		}
    	};
    }

    // (111:12) <TabList vertical>
    function create_default_slot_3$6(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = Object.keys(/*demos*/ ctx[6]);
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
    			if (dirty & /*Object, demos*/ 64) {
    				each_value_1 = Object.keys(/*demos*/ ctx[6]);
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

    // (109:8) <Drawer bind:open on:close={closeDrawer}>
    function create_default_slot_2$7(ctx) {
    	let div;
    	let t;
    	let tablist;
    	let current;

    	tablist = new List$1({
    			props: {
    				vertical: true,
    				$$slots: { default: [create_default_slot_3$6] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			t = space();
    			create_component(tablist.$$.fragment);
    			set_style(div, "width", "15vw");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t, anchor);
    			mount_component(tablist, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablist_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablist.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t);
    			destroy_component(tablist, detaching);
    		}
    	};
    }

    // (123:20) <TabPanel value={demo}>
    function create_default_slot_1$8(ctx) {
    	let switch_instance;
    	let t;
    	let current;
    	var switch_value = /*component*/ ctx[12];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[12])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, t.parentNode, t);
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
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (122:16) {#each Object.entries(demos) as [demo, component]}
    function create_each_block$6(ctx) {
    	let tabpanel;
    	let current;

    	tabpanel = new Panel({
    			props: {
    				value: /*demo*/ ctx[11],
    				$$slots: { default: [create_default_slot_1$8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tabpanel.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabpanel, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tabpanel_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				tabpanel_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel.$set(tabpanel_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tabpanel.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tabpanel.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tabpanel, detaching);
    		}
    	};
    }

    // (108:4) <Tabs bind:selectedTab>
    function create_default_slot$c(ctx) {
    	let drawer;
    	let updating_open;
    	let t;
    	let div;
    	let demo_area;
    	let current;

    	function drawer_open_binding(value) {
    		/*drawer_open_binding*/ ctx[8].call(null, value);
    	}

    	let drawer_props = {
    		$$slots: { default: [create_default_slot_2$7] },
    		$$scope: { ctx }
    	};

    	if (/*open*/ ctx[1] !== void 0) {
    		drawer_props.open = /*open*/ ctx[1];
    	}

    	drawer = new Drawer({ props: drawer_props });
    	binding_callbacks.push(() => bind(drawer, "open", drawer_open_binding));
    	drawer.$on("close", /*closeDrawer*/ ctx[5]);
    	let each_value = Object.entries(/*demos*/ ctx[6]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(drawer.$$.fragment);
    			t = space();
    			div = element("div");
    			demo_area = element("demo-area");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(demo_area, "class", "svelte-1vuegt6");
    		},
    		m(target, anchor) {
    			mount_component(drawer, target, anchor);
    			insert(target, t, anchor);
    			insert(target, div, anchor);
    			append(div, demo_area);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(demo_area, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const drawer_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				drawer_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_open && dirty & /*open*/ 2) {
    				updating_open = true;
    				drawer_changes.open = /*open*/ ctx[1];
    				add_flush_callback(() => updating_open = false);
    			}

    			drawer.$set(drawer_changes);

    			if (dirty & /*Object, demos*/ 64) {
    				each_value = Object.entries(/*demos*/ ctx[6]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(demo_area, null);
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
    			transition_in(drawer.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(drawer.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(drawer, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$C(ctx) {
    	let apptheme;
    	let t0;
    	let page_layout;
    	let appbar;
    	let t1;
    	let tabs;
    	let updating_selectedTab;
    	let current;

    	apptheme = new App_theme({
    			props: { theme: /*theme*/ ctx[3], baseline: Baseline }
    		});

    	appbar = new App_bar({
    			props: {
    				$$slots: { default: [create_default_slot_5$5] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs_selectedTab_binding(value) {
    		/*tabs_selectedTab_binding*/ ctx[9].call(null, value);
    	}

    	let tabs_props = {
    		$$slots: { default: [create_default_slot$c] },
    		$$scope: { ctx }
    	};

    	if (/*selectedTab*/ ctx[2] !== void 0) {
    		tabs_props.selectedTab = /*selectedTab*/ ctx[2];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, "selectedTab", tabs_selectedTab_binding));

    	return {
    		c() {
    			create_component(apptheme.$$.fragment);
    			t0 = space();
    			page_layout = element("page-layout");
    			create_component(appbar.$$.fragment);
    			t1 = space();
    			create_component(tabs.$$.fragment);
    			set_custom_element_data(page_layout, "class", "svelte-1vuegt6");
    		},
    		m(target, anchor) {
    			mount_component(apptheme, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, page_layout, anchor);
    			mount_component(appbar, page_layout, null);
    			append(page_layout, t1);
    			mount_component(tabs, page_layout, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const apptheme_changes = {};
    			if (dirty & /*theme*/ 8) apptheme_changes.theme = /*theme*/ ctx[3];
    			apptheme.$set(apptheme_changes);
    			const appbar_changes = {};

    			if (dirty & /*$$scope, checked*/ 131073) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);
    			const tabs_changes = {};

    			if (dirty & /*$$scope, open*/ 131074) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_selectedTab && dirty & /*selectedTab*/ 4) {
    				updating_selectedTab = true;
    				tabs_changes.selectedTab = /*selectedTab*/ ctx[2];
    				add_flush_callback(() => updating_selectedTab = false);
    			}

    			tabs.$set(tabs_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(apptheme.$$.fragment, local);
    			transition_in(appbar.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(apptheme.$$.fragment, local);
    			transition_out(appbar.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(apptheme, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(page_layout);
    			destroy_component(appbar);
    			destroy_component(tabs);
    		}
    	};
    }
    const func = s => s.toUpperCase();

    function instance$A($$self, $$props, $$invalidate) {
    	let checked = JSON.parse(localStorage.themeToggle ?? "false");

    	// const theme = darkTheme
    	// const theme = lightTheme
    	// const theme = DarkTheme
    	let open = false;

    	const openDrawer = () => $$invalidate(1, open = true);
    	const closeDrawer = () => $$invalidate(1, open = false);
    	let selectedTab = document.location.hash.toString().slice(1);

    	const demos = {
    		"app-bar": App_bar$1,
    		"button": Button_1,
    		"chip": Chip_1,
    		"list": List_1,
    		"textArea": Text_area$1,
    		"textInput": Text_input$1
    	};

    	function checkbox_checked_binding(value) {
    		checked = value;
    		$$invalidate(0, checked);
    	}

    	function drawer_open_binding(value) {
    		open = value;
    		$$invalidate(1, open);
    	}

    	function tabs_selectedTab_binding(value) {
    		selectedTab = value;
    		$$invalidate(2, selectedTab);
    	}

    	let theme;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked*/ 1) {
    			 $$invalidate(3, theme = checked === true ? Dark : Light);
    		}

    		if ($$self.$$.dirty & /*checked*/ 1) {
    			 localStorage.themeToggle = JSON.stringify(checked);
    		}

    		if ($$self.$$.dirty & /*selectedTab*/ 4) {
    			 (closeDrawer());
    		}

    		if ($$self.$$.dirty & /*selectedTab*/ 4) {
    			 (document.location.hash = selectedTab);
    		}
    	};

    	return [
    		checked,
    		open,
    		selectedTab,
    		theme,
    		openDrawer,
    		closeDrawer,
    		demos,
    		checkbox_checked_binding,
    		drawer_open_binding,
    		tabs_selectedTab_binding
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document_1.getElementById("svelte-1vuegt6-style")) add_css$u();
    		init(this, options, instance$A, create_fragment$C, safe_not_equal, {});
    	}
    }

    var main = new App({
        target: document.body,
    });

    return main;

}());
