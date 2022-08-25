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
        return style_element;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
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
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
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
        const doc = get_root_for_style(node);
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = append_empty_stylesheet(node).sheet);
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
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
            ctx: null,
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

    /* core\portal.svelte generated by Svelte v3.44.2 */

    function create_fragment$x(ctx) {
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
    		init(this, options, null, create_fragment$x, safe_not_equal, {});
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

    /* core\modal.svelte generated by Svelte v3.44.2 */

    function add_css$m(target) {
    	append_styles(target, "svelte-1m4blp0", "modal-wrapper.svelte-1m4blp0{position:fixed;top:0px;left:0px;width:100vw;height:100vh;background-color:rgba(0, 0, 0, 0.35);z-index:500}modal-wrapper.clear.svelte-1m4blp0{background-color:transparent}");
    }

    function create_fragment$w(ctx) {
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

    			if (dirty & /*clear*/ 1) {
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

    function instance$w($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$w, create_fragment$w, safe_not_equal, { clear: 0, persistent: 3 }, add_css$m);
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.44.2 */

    function add_css$l(target) {
    	append_styles(target, "svelte-6khfl4", "drawer-wrapper.svelte-6khfl4{position:absolute;top:0px;left:0px;height:100vh;min-width:10vw;background-color:var(--card-background)}");
    }

    // (56:0) {#if current !== null}
    function create_if_block$6(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot$a] },
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
    function create_default_slot$a(ctx) {
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
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			drawer_wrapper = element("drawer-wrapper");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			set_custom_element_data(drawer_wrapper, "class", "svelte-6khfl4");
    		},
    		m(target, anchor) {
    			insert(target, drawer_wrapper, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, drawer_wrapper, null);
    			}

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
    					switch_instance = new switch_value(switch_props());
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

    function create_fragment$v(ctx) {
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

    function instance$v($$self, $$props, $$invalidate) {
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

    class Drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$v, create_fragment$v, safe_not_equal, {}, add_css$l);
    	}
    }

    /* core\dialog.svelte generated by Svelte v3.44.2 */

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i].component;
    	child_ctx[4] = list[i].modalClose;
    	child_ctx[5] = list[i].persistent;
    	child_ctx[6] = list[i].props;
    	return child_ctx;
    }

    // (45:4) <Modal {persistent} on:close={modalClose}>
    function create_default_slot$9(ctx) {
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
    					switch_instance = new switch_value(switch_props());
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
    function create_each_block$6(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				persistent: /*persistent*/ ctx[5],
    				$$slots: { default: [create_default_slot$9] },
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

    function create_fragment$u(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*dialogs*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
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
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
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

    function instance$u($$self, $$props, $$invalidate) {
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

    class Dialog extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {});
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

    /* core\ripple.svelte generated by Svelte v3.44.2 */

    function add_css$k(target) {
    	append_styles(target, "svelte-acwzgw", "ripple-wrapper.svelte-acwzgw{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-acwzgw{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}");
    }

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (107:4) {#each ripples as info (info.id)}
    function create_each_block$5(key_1, ctx) {
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

    function create_fragment$t(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[8].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$5(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$5(key, child_ctx));
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
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block$5, null, get_each_context$5);
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

    function instance$t($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, { color: 0, disabled: 5 }, add_css$k);
    	}
    }

    /* core\action-area.svelte generated by Svelte v3.44.2 */

    function add_css$j(target) {
    	append_styles(target, "svelte-qjr29k", "action-area.svelte-qjr29k{--ripple-color:var(--ripple-normal);display:grid;overflow:hidden;position:relative;cursor:pointer}");
    }

    function create_fragment$s(ctx) {
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

    function instance$s($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, { class: 0 }, add_css$j);
    	}
    }

    /* core\adornment.svelte generated by Svelte v3.44.2 */

    function add_css$i(target) {
    	append_styles(target, "svelte-18ttflk", "doric-adornment.svelte-18ttflk{display:grid;padding:4px}doric-adornment.flush.svelte-18ttflk{padding:0px}");
    }

    function create_fragment$r(ctx) {
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

    			if (dirty & /*flush*/ 1) {
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

    function instance$r($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, { flush: 0 }, add_css$i);
    	}
    }

    /* core\app-bar.svelte generated by Svelte v3.44.2 */

    function add_css$h(target) {
    	append_styles(target, "svelte-qlt8n4", "doric-app-bar.svelte-qlt8n4{position:relative;z-index:+0;grid-template-rows:56px min-content;background-color:var(--title-bar-background);color:var(--title-bar-text);display:grid;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25)}doric-app-bar.svelte-qlt8n4:not(.compact) doric-adornment > *:not([ignore-titlebar-reskin]){--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark);--control-border:var(--title-bar-text);--control-border-focus:var(--title-bar-text)}title-area.svelte-qlt8n4{display:grid;grid-template-columns:max-content auto max-content}title-text.svelte-qlt8n4{font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}title-text.center.svelte-qlt8n4{justify-content:center}");
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
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (50:28)               
    function fallback_block$4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$q(ctx) {
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
    	const action_slot_or_fallback = action_slot || fallback_block$4();
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
    			set_custom_element_data(title_text, "class", "svelte-qlt8n4");
    			toggle_class(title_text, "center", /*center*/ ctx[0]);
    			set_custom_element_data(title_area, "class", "svelte-qlt8n4");
    			set_custom_element_data(doric_app_bar, "class", "svelte-qlt8n4");
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

    			if (dirty & /*center*/ 1) {
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

    function instance$q($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, { center: 0 }, add_css$h);
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

    /* core\app-style.svelte generated by Svelte v3.44.2 */

    function create_fragment$p(ctx) {
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
    		switch_instance0 = new switch_value(switch_props());
    	}

    	var switch_value_1 = /*baseline*/ ctx[1];

    	function switch_props_1(ctx) {
    		return {};
    	}

    	if (switch_value_1) {
    		switch_instance1 = new switch_value_1(switch_props_1());
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
    			if (switch_instance0) {
    				mount_component(switch_instance0, target, anchor);
    			}

    			insert(target, t0, anchor);

    			if (switch_instance1) {
    				mount_component(switch_instance1, target, anchor);
    			}

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
    					switch_instance0 = new switch_value(switch_props());
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
    					switch_instance1 = new switch_value_1(switch_props_1());
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

    function instance$p($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, { theme: 0, baseline: 1 });
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

    /* core\baseline.svelte generated by Svelte v3.44.2 */

    function add_css$g(target) {
    	append_styles(target, "svelte-vbv37c", "*{box-sizing:border-box}html{margin:0px;padding:0px;width:100%;height:100%;overflow:hidden}body{position:fixed;margin:0px;padding:0px;width:100%;height:100%;overflow:hidden;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--layer-border-color);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert)}");
    }

    function create_fragment$o(ctx) {
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
    			html_tag = new HtmlTag();
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

    function instance$o($$self) {
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
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {}, add_css$g);
    	}
    }

    /* core\button.svelte generated by Svelte v3.44.2 */

    function add_css$f(target) {
    	append_styles(target, "svelte-rmbrdp", "doric-button.svelte-rmbrdp{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;z-index:+0;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}.round.svelte-rmbrdp{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.compact.svelte-rmbrdp{width:var(--button-round-size);padding:4px 8px}.adorn.svelte-rmbrdp{padding-top:2px;padding-bottom:2px}.disabled.svelte-rmbrdp{filter:contrast(50%)}.primary.svelte-rmbrdp{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-rmbrdp{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-rmbrdp{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-rmbrdp{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--button-filled-text-color)}.outline.svelte-rmbrdp{border:1px solid var(--button-color);color:var(--button-color)}.square.svelte-rmbrdp{border-radius:0px}");
    }

    function create_fragment$n(ctx) {
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
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[1] } });

    	return {
    		c() {
    			doric_button = element("doric-button");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(doric_button, "class", doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[2] + " svelte-rmbrdp"));
    			toggle_class(doric_button, "disabled", /*disabled*/ ctx[1]);
    			toggle_class(doric_button, "round", /*round*/ ctx[5]);
    			toggle_class(doric_button, "compact", /*compact*/ ctx[4]);
    			toggle_class(doric_button, "adorn", /*adorn*/ ctx[3]);
    			toggle_class(doric_button, "square", /*square*/ ctx[6]);
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
    			if (dirty & /*disabled*/ 2) ripple_changes.disabled = /*disabled*/ ctx[1];
    			ripple.$set(ripple_changes);

    			if (!current || dirty & /*color, variant*/ 5 && doric_button_class_value !== (doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[2] + " svelte-rmbrdp"))) {
    				set_custom_element_data(doric_button, "class", doric_button_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 128) vars_action.update.call(null, /*buttonVars*/ ctx[7]);

    			if (dirty & /*color, variant, disabled*/ 7) {
    				toggle_class(doric_button, "disabled", /*disabled*/ ctx[1]);
    			}

    			if (dirty & /*color, variant, round*/ 37) {
    				toggle_class(doric_button, "round", /*round*/ ctx[5]);
    			}

    			if (dirty & /*color, variant, compact*/ 21) {
    				toggle_class(doric_button, "compact", /*compact*/ ctx[4]);
    			}

    			if (dirty & /*color, variant, adorn*/ 13) {
    				toggle_class(doric_button, "adorn", /*adorn*/ ctx[3]);
    			}

    			if (dirty & /*color, variant, square*/ 69) {
    				toggle_class(doric_button, "square", /*square*/ ctx[6]);
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

    function instance$n($$self, $$props, $$invalidate) {
    	let buttonVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { color = "default" } = $$props;
    	let { disabled = false } = $$props;
    	let { variant = "normal" } = $$props;
    	let { adorn } = $$props;
    	let { compact } = $$props;
    	let { round } = $$props;
    	let { square } = $$props;
    	let { buttonColor = null } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		// Mobile browsers don't like dispatching events inside custom events
    		setTimeout(() => dispatch("tap", evt), 0);
    	};

    	$$self.$$set = $$props => {
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ('variant' in $$props) $$invalidate(2, variant = $$props.variant);
    		if ('adorn' in $$props) $$invalidate(3, adorn = $$props.adorn);
    		if ('compact' in $$props) $$invalidate(4, compact = $$props.compact);
    		if ('round' in $$props) $$invalidate(5, round = $$props.round);
    		if ('square' in $$props) $$invalidate(6, square = $$props.square);
    		if ('buttonColor' in $$props) $$invalidate(9, buttonColor = $$props.buttonColor);
    		if ('$$scope' in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*round, buttonColor*/ 544) {
    			$$invalidate(7, buttonVars = {
    				"button-round-size": round,
    				"button-color": buttonColor
    			});
    		}
    	};

    	return [
    		color,
    		disabled,
    		variant,
    		adorn,
    		compact,
    		round,
    		square,
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
    			instance$n,
    			create_fragment$n,
    			safe_not_equal,
    			{
    				color: 0,
    				disabled: 1,
    				variant: 2,
    				adorn: 3,
    				compact: 4,
    				round: 5,
    				square: 6,
    				buttonColor: 9
    			},
    			add_css$f
    		);
    	}
    }

    /* core\icon.svelte generated by Svelte v3.44.2 */

    function add_css$e(target) {
    	append_styles(target, "svelte-od4xq0", "doric-icon.svelte-od4xq0{margin:0px 4px;font-size:var(--icon-font-size)}");
    }

    function create_fragment$m(ctx) {
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

    function instance$m($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { name: 3, size: 4 }, add_css$e);
    	}
    }

    /* core\control-drawer.svelte generated by Svelte v3.44.2 */

    function add_css$d(target) {
    	append_styles(target, "svelte-1mojifh", "control-drawer.svelte-1mojifh{position:absolute;top:0px;right:0px;height:100vh;min-width:25vw;background-color:var(--card-background);overflow-y:auto}");
    }

    // (36:0) {#if show}
    function create_if_block$5(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				persistent: /*persistent*/ ctx[0],
    				$$slots: { default: [create_default_slot$8] },
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
    function create_default_slot$8(ctx) {
    	let control_drawer;
    	let control_drawer_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	return {
    		c() {
    			control_drawer = element("control-drawer");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(control_drawer, "class", "svelte-1mojifh");
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

    function create_fragment$l(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[2] && create_if_block$5(ctx);

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

    function instance$l($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, { persistent: 0, open: 3, close: 1 }, add_css$d);
    	}

    	get open() {
    		return this.$$.ctx[3];
    	}

    	get close() {
    		return this.$$.ctx[1];
    	}
    }

    /* core\footer.svelte generated by Svelte v3.44.2 */

    function add_css$c(target) {
    	append_styles(target, "svelte-1pkffet", "doric-footer.svelte-1pkffet{display:grid;grid-template-columns:max-content auto max-content;box-shadow:0px -2px 4px rgba(0, 0, 0, 0.25);height:56px;gap:2px;padding:2px;background-color:var(--card-background);--border-color:var(--text-normal)}doric-footer.bordered.svelte-1pkffet{border:1px solid var(--border-color)}footer-area.svelte-1pkffet{display:grid}");
    }

    const get_right_slot_changes = dirty => ({});
    const get_right_slot_context = ctx => ({});
    const get_left_slot_changes = dirty => ({});
    const get_left_slot_context = ctx => ({});

    function create_fragment$k(ctx) {
    	let doric_footer;
    	let footer_area0;
    	let t0;
    	let footer_area1;
    	let t1;
    	let footer_area2;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const left_slot_template = /*#slots*/ ctx[4].left;
    	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[3], get_left_slot_context);
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	const right_slot_template = /*#slots*/ ctx[4].right;
    	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[3], get_right_slot_context);

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
    			set_custom_element_data(footer_area0, "class", "svelte-1pkffet");
    			set_custom_element_data(footer_area1, "class", "svelte-1pkffet");
    			set_custom_element_data(footer_area2, "class", "svelte-1pkffet");
    			set_custom_element_data(doric_footer, "class", "svelte-1pkffet");
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
    				dispose = action_destroyer(vars_action = vars.call(null, doric_footer, /*footerOpts*/ ctx[1]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (left_slot) {
    				if (left_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						left_slot,
    						left_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(left_slot_template, /*$$scope*/ ctx[3], dirty, get_left_slot_changes),
    						get_left_slot_context
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

    			if (right_slot) {
    				if (right_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						right_slot,
    						right_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(right_slot_template, /*$$scope*/ ctx[3], dirty, get_right_slot_changes),
    						get_right_slot_context
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*footerOpts*/ 2) vars_action.update.call(null, /*footerOpts*/ ctx[1]);

    			if (dirty & /*bordered*/ 1) {
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
    			dispose();
    		}
    	};
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let footerOpts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { bordered = false } = $$props;
    	let { borderColor = null } = $$props;

    	$$self.$$set = $$props => {
    		if ('bordered' in $$props) $$invalidate(0, bordered = $$props.bordered);
    		if ('borderColor' in $$props) $$invalidate(2, borderColor = $$props.borderColor);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*borderColor*/ 4) {
    			$$invalidate(1, footerOpts = { "border-color": borderColor });
    		}
    	};

    	return [bordered, footerOpts, borderColor, $$scope, slots];
    }

    class Footer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { bordered: 0, borderColor: 2 }, add_css$c);
    	}
    }

    /* core\text.svelte generated by Svelte v3.44.2 */

    function add_css$b(target) {
    	append_styles(target, "svelte-1oawf68", "span.svelte-1oawf68{color:var(--typography-color);font-size:var(--typography-size)}.block.svelte-1oawf68{display:block}.secondary.svelte-1oawf68{font-size:var(--text-size-secondary)}.primary.svelte-1oawf68{color:var(--primary)}.secondary.svelte-1oawf68{color:var(--secondary)}.danger.svelte-1oawf68{color:var(--danger)}.left.svelte-1oawf68{text-align:left}.right.svelte-1oawf68{text-align:right}.center.svelte-1oawf68{text-align:center}.adorn.svelte-1oawf68{display:flex;align-items:center;justify-content:center}");
    }

    function create_fragment$j(ctx) {
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
    			attr(span, "class", span_class_value = "" + (/*color*/ ctx[4] + " " + /*align*/ ctx[2] + " svelte-1oawf68"));
    			toggle_class(span, "block", /*block*/ ctx[1]);
    			toggle_class(span, "adorn", /*adorn*/ ctx[3]);
    			toggle_class(span, "secondary", /*secondary*/ ctx[0]);
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

    			if (!current || dirty & /*color, align*/ 20 && span_class_value !== (span_class_value = "" + (/*color*/ ctx[4] + " " + /*align*/ ctx[2] + " svelte-1oawf68"))) {
    				attr(span, "class", span_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*textOpts*/ 32) vars_action.update.call(null, /*textOpts*/ ctx[5]);

    			if (dirty & /*color, align, block*/ 22) {
    				toggle_class(span, "block", /*block*/ ctx[1]);
    			}

    			if (dirty & /*color, align, adorn*/ 28) {
    				toggle_class(span, "adorn", /*adorn*/ ctx[3]);
    			}

    			if (dirty & /*color, align, secondary*/ 21) {
    				toggle_class(span, "secondary", /*secondary*/ ctx[0]);
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

    function instance$j($$self, $$props, $$invalidate) {
    	let textOpts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { secondary = false } = $$props;
    	let { block = false } = $$props;
    	let { align = "left" } = $$props;
    	let { adorn } = $$props;
    	let { color = "" } = $$props;
    	let { textColor = null } = $$props;
    	let { textSize = null } = $$props;

    	$$self.$$set = $$props => {
    		if ('secondary' in $$props) $$invalidate(0, secondary = $$props.secondary);
    		if ('block' in $$props) $$invalidate(1, block = $$props.block);
    		if ('align' in $$props) $$invalidate(2, align = $$props.align);
    		if ('adorn' in $$props) $$invalidate(3, adorn = $$props.adorn);
    		if ('color' in $$props) $$invalidate(4, color = $$props.color);
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
    		secondary,
    		block,
    		align,
    		adorn,
    		color,
    		textOpts,
    		textColor,
    		textSize,
    		$$scope,
    		slots
    	];
    }

    class Text extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$j,
    			create_fragment$j,
    			safe_not_equal,
    			{
    				secondary: 0,
    				block: 1,
    				align: 2,
    				adorn: 3,
    				color: 4,
    				textColor: 6,
    				textSize: 7
    			},
    			add_css$b
    		);
    	}
    }

    /* core\select\option-list.svelte generated by Svelte v3.44.2 */

    function add_css$a(target) {
    	append_styles(target, "svelte-kve6y9", "option-list.svelte-kve6y9{display:grid;grid-template-columns:24px 1fr;grid-auto-rows:40px;padding:8px;gap:2px}");
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i].label;
    	child_ctx[9] = list[i].value;
    	child_ctx[10] = list[i].icon;
    	return child_ctx;
    }

    // (27:12) {#if value === currentValue}
    function create_if_block$4(ctx) {
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
    function create_default_slot_1$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*value*/ ctx[9] === /*currentValue*/ ctx[4] && create_if_block$4();

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
    					if_block = create_if_block$4();
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

    // (31:8) <Button on:tap={() => select(value)} {variant} {color} {square}>
    function create_default_slot$7(ctx) {
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
    function create_each_block$4(ctx) {
    	let text_1;
    	let t;
    	let button;
    	let current;

    	text_1 = new Text({
    			props: {
    				adorn: true,
    				color: /*color*/ ctx[0],
    				$$slots: { default: [create_default_slot_1$6] },
    				$$scope: { ctx }
    			}
    		});

    	function tap_handler() {
    		return /*tap_handler*/ ctx[7](/*value*/ ctx[9]);
    	}

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[1],
    				color: /*color*/ ctx[0],
    				square: /*square*/ ctx[2],
    				$$slots: { default: [create_default_slot$7] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", tap_handler);

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

    function create_fragment$i(ctx) {
    	let option_list;
    	let current;
    	let each_value = /*options*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
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
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
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

    function instance$i($$self, $$props, $$invalidate) {
    	let select;
    	let currentValue;
    	let options;
    	let { color = "primary" } = $$props;
    	let { variant = "outline" } = $$props;
    	let { square = true } = $$props;
    	let { info } = $$props;
    	const tap_handler = value => select(value);

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

    	return [color, variant, square, options, currentValue, select, info, tap_handler];
    }

    class Option_list extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { color: 0, variant: 1, square: 2, info: 6 }, add_css$a);
    	}
    }

    /* core\paper.svelte generated by Svelte v3.44.2 */

    function add_css$9(target) {
    	append_styles(target, "svelte-n7qgmm", "doric-paper.svelte-n7qgmm{display:grid;border-radius:4px;border-style:solid;border-width:0px;box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25);overflow:hidden;grid-template-columns:1fr;grid-template-rows:min-content auto min-content;background-color:var(--card-background);border-color:var(--border-color, var(--layer-border-color))}doric-paper.card.svelte-n7qgmm{border-width:var(--layer-border-width)}doric-paper.square.svelte-n7qgmm{border-radius:0px}doric-paper.center.svelte-n7qgmm{margin:auto}doric-paper.flat.svelte-n7qgmm{box-shadow:none}doric-paper.scrollable.svelte-n7qgmm{max-height:100%;overflow:auto}");
    }

    const get_action_slot_changes$1 = dirty => ({});
    const get_action_slot_context$1 = ctx => ({});
    const get_title_slot_changes$1 = dirty => ({});
    const get_title_slot_context$1 = ctx => ({});

    // (60:23)           
    function fallback_block_1$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (64:24)           
    function fallback_block$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$h(ctx) {
    	let doric_paper;
    	let t0;
    	let t1;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const title_slot_template = /*#slots*/ ctx[8].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[7], get_title_slot_context$1);
    	const title_slot_or_fallback = title_slot || fallback_block_1$3();
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);
    	const action_slot_template = /*#slots*/ ctx[8].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[7], get_action_slot_context$1);
    	const action_slot_or_fallback = action_slot || fallback_block$3();

    	return {
    		c() {
    			doric_paper = element("doric-paper");
    			if (title_slot_or_fallback) title_slot_or_fallback.c();
    			t0 = space();
    			if (default_slot) default_slot.c();
    			t1 = space();
    			if (action_slot_or_fallback) action_slot_or_fallback.c();
    			set_custom_element_data(doric_paper, "class", "svelte-n7qgmm");
    			toggle_class(doric_paper, "card", /*card*/ ctx[0]);
    			toggle_class(doric_paper, "center", /*center*/ ctx[1]);
    			toggle_class(doric_paper, "flat", /*flat*/ ctx[2]);
    			toggle_class(doric_paper, "square", /*square*/ ctx[4]);
    			toggle_class(doric_paper, "scrollable", /*scrollable*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, doric_paper, anchor);

    			if (title_slot_or_fallback) {
    				title_slot_or_fallback.m(doric_paper, null);
    			}

    			append(doric_paper, t0);

    			if (default_slot) {
    				default_slot.m(doric_paper, null);
    			}

    			append(doric_paper, t1);

    			if (action_slot_or_fallback) {
    				action_slot_or_fallback.m(doric_paper, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_paper, /*variables*/ ctx[5]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (title_slot) {
    				if (title_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot_base(
    						title_slot,
    						title_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[7], dirty, get_title_slot_changes$1),
    						get_title_slot_context$1
    					);
    				}
    			}

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

    			if (action_slot) {
    				if (action_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot_base(
    						action_slot,
    						action_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(action_slot_template, /*$$scope*/ ctx[7], dirty, get_action_slot_changes$1),
    						get_action_slot_context$1
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*variables*/ 32) vars_action.update.call(null, /*variables*/ ctx[5]);

    			if (dirty & /*card*/ 1) {
    				toggle_class(doric_paper, "card", /*card*/ ctx[0]);
    			}

    			if (dirty & /*center*/ 2) {
    				toggle_class(doric_paper, "center", /*center*/ ctx[1]);
    			}

    			if (dirty & /*flat*/ 4) {
    				toggle_class(doric_paper, "flat", /*flat*/ ctx[2]);
    			}

    			if (dirty & /*square*/ 16) {
    				toggle_class(doric_paper, "square", /*square*/ ctx[4]);
    			}

    			if (dirty & /*scrollable*/ 8) {
    				toggle_class(doric_paper, "scrollable", /*scrollable*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot_or_fallback, local);
    			transition_in(default_slot, local);
    			transition_in(action_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot_or_fallback, local);
    			transition_out(default_slot, local);
    			transition_out(action_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_paper);
    			if (title_slot_or_fallback) title_slot_or_fallback.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (action_slot_or_fallback) action_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let variables;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { card } = $$props;
    	let { center } = $$props;
    	let { flat } = $$props;
    	let { scrollable } = $$props;
    	let { square } = $$props;
    	let { borderColor = null } = $$props;

    	$$self.$$set = $$props => {
    		if ('card' in $$props) $$invalidate(0, card = $$props.card);
    		if ('center' in $$props) $$invalidate(1, center = $$props.center);
    		if ('flat' in $$props) $$invalidate(2, flat = $$props.flat);
    		if ('scrollable' in $$props) $$invalidate(3, scrollable = $$props.scrollable);
    		if ('square' in $$props) $$invalidate(4, square = $$props.square);
    		if ('borderColor' in $$props) $$invalidate(6, borderColor = $$props.borderColor);
    		if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*borderColor*/ 64) {
    			$$invalidate(5, variables = { "border-color": borderColor });
    		}
    	};

    	return [card, center, flat, scrollable, square, variables, borderColor, $$scope, slots];
    }

    class Paper extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$h,
    			create_fragment$h,
    			safe_not_equal,
    			{
    				card: 0,
    				center: 1,
    				flat: 2,
    				scrollable: 3,
    				square: 4,
    				borderColor: 6
    			},
    			add_css$9
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

    /* core\screen.svelte generated by Svelte v3.44.2 */

    function add_css$8(target) {
    	append_styles(target, "svelte-vxf966", "doric-screen.svelte-vxf966{display:grid;width:calc(100% - var(--sub-pixel-offset));height:calc(100% - 1px);overflow:hidden;position:absolute;background-color:rgba(0, 0, 0, 0.5);grid-template-columns:auto\n            min(\n                calc(\n                    var(--parent-width) - calc(16px * var(--stack))\n                ),\n                var(--screen-width)\n            )\n            auto\n        ;grid-template-rows:min-content auto min-content;grid-template-areas:var(--title-row, \". title .\")\n            var(--content-row, \". content .\")\n            var(--footer-row, \". footer .\")\n        ;padding-top:calc(8px * var(--stack));padding-bottom:0px}doric-screen.main.svelte-vxf966{background-color:transparent}.full-title.svelte-vxf966,.full.svelte-vxf966{--title-row:\"title title title\"}.full-content.svelte-vxf966,.full.svelte-vxf966{--content-row:\"content content content\"}.full-footer.svelte-vxf966,.full.svelte-vxf966{--footer-row:\"footer footer footer\"}title-area.svelte-vxf966{display:grid;grid-area:title}footer-area.svelte-vxf966{display:grid;grid-area:footer}content-area.svelte-vxf966{display:grid;grid-area:content;height:100%;overflow:hidden}");
    }

    const get_footer_slot_changes = dirty => ({});
    const get_footer_slot_context = ctx => ({});
    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});

    // (129:4) {#if $$slots.title}
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

    // (137:4) {#if $$slots.footer}
    function create_if_block$3(ctx) {
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

    function create_fragment$g(ctx) {
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
    	let if_block1 = /*$$slots*/ ctx[10].footer && create_if_block$3(ctx);
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
    		switch_instance = new switch_value(switch_props());
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
    			toggle_class(doric_screen, "full-title", /*fullTitle*/ ctx[1]);
    			toggle_class(doric_screen, "full-content", /*fullContent*/ ctx[2]);
    			toggle_class(doric_screen, "full-footer", /*fullFooter*/ ctx[3]);
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

    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

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
    					if_block1 = create_if_block$3(ctx);
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

    			if (dirty & /*full*/ 1) {
    				toggle_class(doric_screen, "full", /*full*/ ctx[0]);
    			}

    			if (dirty & /*fullTitle*/ 2) {
    				toggle_class(doric_screen, "full-title", /*fullTitle*/ ctx[1]);
    			}

    			if (dirty & /*fullContent*/ 4) {
    				toggle_class(doric_screen, "full-content", /*fullContent*/ ctx[2]);
    			}

    			if (dirty & /*fullFooter*/ 8) {
    				toggle_class(doric_screen, "full-footer", /*fullFooter*/ ctx[3]);
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
    					switch_instance = new switch_value(switch_props());
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

    function instance$g($$self, $$props, $$invalidate) {
    	let screenVars;
    	let $finish;
    	let $finishFunc;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { full = false } = $$props;
    	let { fullTitle = false } = $$props;
    	let { fullContent = false } = $$props;
    	let { fullFooter = false } = $$props;
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

    	const closeStack = () => {
    		$$invalidate(4, stackComp = null);
    		$$invalidate(5, stackProps = {});
    	};

    	const close = value => {
    		if ($finish === null) {
    			return;
    		}

    		$finish(value);
    	};

    	$$self.$$set = $$props => {
    		if ('full' in $$props) $$invalidate(0, full = $$props.full);
    		if ('fullTitle' in $$props) $$invalidate(1, fullTitle = $$props.fullTitle);
    		if ('fullContent' in $$props) $$invalidate(2, fullContent = $$props.fullContent);
    		if ('fullFooter' in $$props) $$invalidate(3, fullFooter = $$props.fullFooter);
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
    		fullTitle,
    		fullContent,
    		fullFooter,
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
    			instance$g,
    			create_fragment$g,
    			safe_not_equal,
    			{
    				full: 0,
    				fullTitle: 1,
    				fullContent: 2,
    				fullFooter: 3,
    				width: 11,
    				openStack: 12,
    				closeStack: 13,
    				close: 14
    			},
    			add_css$8
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

    /* core\text-input.svelte generated by Svelte v3.44.2 */

    function add_css$7(target) {
    	append_styles(target, "svelte-1qyt5dn", "doric-text-input.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{position:relative;display:grid;grid-template-columns:1fr;grid-template-rows:max-content max-content;cursor:text}input-area.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{position:relative;display:grid;grid-template-columns:max-content auto max-content;grid-template-rows:max-content auto;grid-template-areas:\"label label label\"\r\n            \". . .\"\r\n        }input-label.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{display:block;user-select:none;font-size:13px;color:var(--control-border);grid-area:label}label-border.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{display:inline-block;border-right:1px solid var(--control-border);border-bottom:1px solid var(--control-border);border-bottom-right-radius:4px;padding:2px 16px;cursor:default}label-border.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn:empty{display:none}input-border.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{border:1px solid var(--control-border);border-radius:4px;pointer-events:none;position:absolute;top:0px;left:0px;bottom:0px;right:0px}extra-text.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{display:block;padding:2px 4px;color:var(--control-border);font-size:var(--text-size-secondary)}extra-text.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn:empty{display:none}input.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{background-color:transparent;color:var(--text-normal);font:var(--font);border-width:0px;height:32px;padding:4px}input.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn:focus{outline:none}doric-text-input.svelte-1qyt5dn:not(.error) input.svelte-1qyt5dn:focus~input-border.svelte-1qyt5dn,doric-text-input.svelte-1qyt5dn:not(.error) input.svelte-1qyt5dn:focus~input-label.svelte-1qyt5dn{--control-border:var(--primary)}doric-text-input.error.svelte-1qyt5dn.svelte-1qyt5dn.svelte-1qyt5dn{--control-border:var(--danger)}doric-text-input.flat.svelte-1qyt5dn input-border.svelte-1qyt5dn.svelte-1qyt5dn{border-radius:0px;border-width:0px;border-bottom-width:2px}doric-text-input.flat.svelte-1qyt5dn label-border.svelte-1qyt5dn.svelte-1qyt5dn{border-radius:0px;border-width:0px;padding:2px 4px}");
    }

    const get_end_slot_changes = dirty => ({});
    const get_end_slot_context = ctx => ({});
    const get_start_slot_changes = dirty => ({});
    const get_start_slot_context = ctx => ({});

    // (115:27)               
    function fallback_block_1$2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (127:25)               
    function fallback_block$2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let doric_text_input;
    	let input_area;
    	let t0;
    	let input_1;
    	let t1;
    	let t2;
    	let input_border;
    	let t3;
    	let input_label;
    	let label_border;
    	let t4;
    	let t5;
    	let extra_text;
    	let t6;
    	let current;
    	let mounted;
    	let dispose;
    	const start_slot_template = /*#slots*/ ctx[12].start;
    	const start_slot = create_slot(start_slot_template, ctx, /*$$scope*/ ctx[11], get_start_slot_context);
    	const start_slot_or_fallback = start_slot || fallback_block_1$2();
    	let input_1_levels = [/*$$props*/ ctx[9], /*cheat*/ ctx[8], { disabled: /*disabled*/ ctx[5] }];
    	let input_1_data = {};

    	for (let i = 0; i < input_1_levels.length; i += 1) {
    		input_1_data = assign(input_1_data, input_1_levels[i]);
    	}

    	const end_slot_template = /*#slots*/ ctx[12].end;
    	const end_slot = create_slot(end_slot_template, ctx, /*$$scope*/ ctx[11], get_end_slot_context);
    	const end_slot_or_fallback = end_slot || fallback_block$2();

    	return {
    		c() {
    			doric_text_input = element("doric-text-input");
    			input_area = element("input-area");
    			if (start_slot_or_fallback) start_slot_or_fallback.c();
    			t0 = space();
    			input_1 = element("input");
    			t1 = space();
    			if (end_slot_or_fallback) end_slot_or_fallback.c();
    			t2 = space();
    			input_border = element("input-border");
    			t3 = space();
    			input_label = element("input-label");
    			label_border = element("label-border");
    			t4 = text(/*label*/ ctx[1]);
    			t5 = space();
    			extra_text = element("extra-text");
    			t6 = text(/*extra*/ ctx[2]);
    			set_attributes(input_1, input_1_data);
    			toggle_class(input_1, "svelte-1qyt5dn", true);
    			set_custom_element_data(input_border, "class", "svelte-1qyt5dn");
    			set_custom_element_data(label_border, "class", "svelte-1qyt5dn");
    			set_custom_element_data(input_label, "class", "svelte-1qyt5dn");
    			set_custom_element_data(input_area, "class", "svelte-1qyt5dn");
    			set_custom_element_data(extra_text, "class", "svelte-1qyt5dn");
    			set_custom_element_data(doric_text_input, "tabindex", "-1");
    			set_custom_element_data(doric_text_input, "class", "svelte-1qyt5dn");
    			toggle_class(doric_text_input, "flat", /*flat*/ ctx[3]);
    			toggle_class(doric_text_input, "error", /*error*/ ctx[4]);
    			toggle_class(doric_text_input, "disabled", /*disabled*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, doric_text_input, anchor);
    			append(doric_text_input, input_area);

    			if (start_slot_or_fallback) {
    				start_slot_or_fallback.m(input_area, null);
    			}

    			append(input_area, t0);
    			append(input_area, input_1);
    			if (input_1.autofocus) input_1.focus();
    			set_input_value(input_1, /*value*/ ctx[0]);
    			/*input_1_binding*/ ctx[16](input_1);
    			append(input_area, t1);

    			if (end_slot_or_fallback) {
    				end_slot_or_fallback.m(input_area, null);
    			}

    			append(input_area, t2);
    			append(input_area, input_border);
    			append(input_area, t3);
    			append(input_area, input_label);
    			append(input_label, label_border);
    			append(label_border, t4);
    			append(doric_text_input, t5);
    			append(doric_text_input, extra_text);
    			append(extra_text, t6);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input_1, "input", /*input_1_input_handler*/ ctx[15]),
    					listen(input_1, "blur", /*blur_handler*/ ctx[13]),
    					listen(input_1, "focus", /*focus_handler*/ ctx[14]),
    					listen(doric_text_input, "focus", /*focus*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (start_slot) {
    				if (start_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot_base(
    						start_slot,
    						start_slot_template,
    						ctx,
    						/*$$scope*/ ctx[11],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
    						: get_slot_changes(start_slot_template, /*$$scope*/ ctx[11], dirty, get_start_slot_changes),
    						get_start_slot_context
    					);
    				}
    			}

    			set_attributes(input_1, input_1_data = get_spread_update(input_1_levels, [
    				dirty & /*$$props*/ 512 && /*$$props*/ ctx[9],
    				dirty & /*cheat*/ 256 && /*cheat*/ ctx[8],
    				(!current || dirty & /*disabled*/ 32) && { disabled: /*disabled*/ ctx[5] }
    			]));

    			if (dirty & /*value*/ 1 && input_1.value !== /*value*/ ctx[0]) {
    				set_input_value(input_1, /*value*/ ctx[0]);
    			}

    			toggle_class(input_1, "svelte-1qyt5dn", true);

    			if (end_slot) {
    				if (end_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot_base(
    						end_slot,
    						end_slot_template,
    						ctx,
    						/*$$scope*/ ctx[11],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
    						: get_slot_changes(end_slot_template, /*$$scope*/ ctx[11], dirty, get_end_slot_changes),
    						get_end_slot_context
    					);
    				}
    			}

    			if (!current || dirty & /*label*/ 2) set_data(t4, /*label*/ ctx[1]);
    			if (!current || dirty & /*extra*/ 4) set_data(t6, /*extra*/ ctx[2]);

    			if (dirty & /*flat*/ 8) {
    				toggle_class(doric_text_input, "flat", /*flat*/ ctx[3]);
    			}

    			if (dirty & /*error*/ 16) {
    				toggle_class(doric_text_input, "error", /*error*/ ctx[4]);
    			}

    			if (dirty & /*disabled*/ 32) {
    				toggle_class(doric_text_input, "disabled", /*disabled*/ ctx[5]);
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
    			if (detaching) detach(doric_text_input);
    			if (start_slot_or_fallback) start_slot_or_fallback.d(detaching);
    			/*input_1_binding*/ ctx[16](null);
    			if (end_slot_or_fallback) end_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let cheat;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { type = "text" } = $$props;
    	let { value } = $$props;
    	let { label = "" } = $$props;
    	let { extra = "" } = $$props;
    	let { flat } = $$props;
    	let { error } = $$props;
    	let { disabled } = $$props;
    	let input = null;

    	function focus() {
    		input.focus();
    	}

    	function blur_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function focus_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_1_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(7, input);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(9, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('type' in $$new_props) $$invalidate(10, type = $$new_props.type);
    		if ('value' in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ('label' in $$new_props) $$invalidate(1, label = $$new_props.label);
    		if ('extra' in $$new_props) $$invalidate(2, extra = $$new_props.extra);
    		if ('flat' in $$new_props) $$invalidate(3, flat = $$new_props.flat);
    		if ('error' in $$new_props) $$invalidate(4, error = $$new_props.error);
    		if ('disabled' in $$new_props) $$invalidate(5, disabled = $$new_props.disabled);
    		if ('$$scope' in $$new_props) $$invalidate(11, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*type*/ 1024) {
    			$$invalidate(8, cheat = { type });
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		value,
    		label,
    		extra,
    		flat,
    		error,
    		disabled,
    		focus,
    		input,
    		cheat,
    		$$props,
    		type,
    		$$scope,
    		slots,
    		blur_handler,
    		focus_handler,
    		input_1_input_handler,
    		input_1_binding
    	];
    }

    class Text_input extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$f,
    			create_fragment$f,
    			safe_not_equal,
    			{
    				type: 10,
    				value: 0,
    				label: 1,
    				extra: 2,
    				flat: 3,
    				error: 4,
    				disabled: 5,
    				focus: 6
    			},
    			add_css$7
    		);
    	}

    	get focus() {
    		return this.$$.ctx[6];
    	}
    }

    /* core\title-bar.svelte generated by Svelte v3.44.2 */

    function add_css$6(target) {
    	append_styles(target, "svelte-m6quge", "doric-title-bar.svelte-m6quge{position:relative;z-index:+0;grid-template-rows:48px min-content;background-color:var(--background-layer);display:grid;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25);border-bottom:2px solid var(--text-normal)}doric-title-bar.sticky.svelte-m6quge{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.compact.svelte-m6quge{grid-template-rows:32px min-content;box-shadow:none}title-area.svelte-m6quge{display:grid;grid-template-columns:max-content auto max-content}title-text.svelte-m6quge{font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}title-text.center.svelte-m6quge{justify-content:center}title-text.compact.svelte-m6quge{font-size:var(--text-size-header)}");
    }

    const get_extension_slot_changes = dirty => ({});
    const get_extension_slot_context = ctx => ({});
    const get_action_slot_changes = dirty => ({});
    const get_action_slot_context = ctx => ({});
    const get_menu_slot_changes = dirty => ({});
    const get_menu_slot_context = ctx => ({});

    // (53:26)               
    function fallback_block_1$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (59:28)               
    function fallback_block$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let doric_title_bar;
    	let title_area;
    	let t0;
    	let title_text;
    	let t1;
    	let t2;
    	let current;
    	const menu_slot_template = /*#slots*/ ctx[4].menu;
    	const menu_slot = create_slot(menu_slot_template, ctx, /*$$scope*/ ctx[3], get_menu_slot_context);
    	const menu_slot_or_fallback = menu_slot || fallback_block_1$1();
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	const action_slot_template = /*#slots*/ ctx[4].action;
    	const action_slot = create_slot(action_slot_template, ctx, /*$$scope*/ ctx[3], get_action_slot_context);
    	const action_slot_or_fallback = action_slot || fallback_block$1();
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
    			set_custom_element_data(title_text, "class", "svelte-m6quge");
    			toggle_class(title_text, "center", /*center*/ ctx[1]);
    			toggle_class(title_text, "compact", /*compact*/ ctx[2]);
    			set_custom_element_data(title_area, "class", "svelte-m6quge");
    			set_custom_element_data(doric_title_bar, "class", "svelte-m6quge");
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

    			if (dirty & /*center*/ 2) {
    				toggle_class(title_text, "center", /*center*/ ctx[1]);
    			}

    			if (dirty & /*compact*/ 4) {
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

    			if (dirty & /*sticky*/ 1) {
    				toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			}

    			if (dirty & /*compact*/ 4) {
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

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { sticky: 0, center: 1, compact: 2 }, add_css$6);
    	}
    }

    /* core\select.svelte generated by Svelte v3.44.2 */

    function add_css$5(target) {
    	append_styles(target, "svelte-11rnerv", "select-layout.svelte-11rnerv{display:grid;flex-grow:1;grid-template-columns:auto max-content}");
    }

    const get_selected_slot_changes = dirty => ({ selected: dirty & /*selected*/ 128 });
    const get_selected_slot_context = ctx => ({ selected: /*selected*/ ctx[7] });
    const get_options_slot_changes = dirty => ({ info: dirty & /*info*/ 256 });
    const get_options_slot_context = ctx => ({ info: /*info*/ ctx[8] });

    // (51:4) {#if label}
    function create_if_block$2(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				compact: true,
    				sticky: true,
    				$$slots: {
    					extension: [create_extension_slot$1],
    					default: [create_default_slot_5$3]
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

    // (52:8) <TitleBar compact sticky>
    function create_default_slot_5$3(ctx) {
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

    // (55:16) {#if searchable}
    function create_if_block_1$1(ctx) {
    	let textinput;
    	let updating_value;
    	let current;

    	function textinput_value_binding(value) {
    		/*textinput_value_binding*/ ctx[14](value);
    	}

    	let textinput_props = { label: "Filter" };

    	if (/*filter*/ ctx[5] !== void 0) {
    		textinput_props.value = /*filter*/ ctx[5];
    	}

    	textinput = new Text_input({ props: textinput_props });
    	binding_callbacks.push(() => bind(textinput, 'value', textinput_value_binding));

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

    // (54:12) <Adornment slot="extension">
    function create_default_slot_4$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*searchable*/ ctx[4] && create_if_block_1$1(ctx);

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
    					if_block = create_if_block_1$1(ctx);
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

    // (54:12) 
    function create_extension_slot$1(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				slot: "extension",
    				$$slots: { default: [create_default_slot_4$4] },
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

    			if (dirty & /*$$scope, filter, searchable*/ 131120) {
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

    // (61:32)           
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

    // (50:0) <ControlDrawer {persistent} bind:this={drawer}>
    function create_default_slot_3$4(ctx) {
    	let t;
    	let current;
    	let if_block = /*label*/ ctx[0] && create_if_block$2(ctx);
    	const options_slot_template = /*#slots*/ ctx[13].options;
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
    					if_block = create_if_block$2(ctx);
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

    // (69:45)                   
    function fallback_block(ctx) {
    	let t0;
    	let t1;
    	let t2_value = /*selected*/ ctx[7].label + "";
    	let t2;

    	return {
    		c() {
    			t0 = text(/*label*/ ctx[0]);
    			t1 = text(": ");
    			t2 = text(t2_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 1) set_data(t0, /*label*/ ctx[0]);
    			if (dirty & /*selected*/ 128 && t2_value !== (t2_value = /*selected*/ ctx[7].label + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(t2);
    		}
    	};
    }

    // (68:8) <Text adorn>
    function create_default_slot_2$4(ctx) {
    	let current;
    	const selected_slot_template = /*#slots*/ ctx[13].selected;
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
    				if (selected_slot_or_fallback && selected_slot_or_fallback.p && (!current || dirty & /*selected, label*/ 129)) {
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

    // (73:8) <Text adorn>
    function create_default_slot_1$5(ctx) {
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

    // (66:0) <Button variant="outline" {...$$props} on:tap={() => drawer.open()} {disabled}>
    function create_default_slot$6(ctx) {
    	let select_layout;
    	let text0;
    	let t;
    	let text1;
    	let current;

    	text0 = new Text({
    			props: {
    				adorn: true,
    				$$slots: { default: [create_default_slot_2$4] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text({
    			props: {
    				adorn: true,
    				$$slots: { default: [create_default_slot_1$5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			select_layout = element("select-layout");
    			create_component(text0.$$.fragment);
    			t = space();
    			create_component(text1.$$.fragment);
    			set_custom_element_data(select_layout, "class", "svelte-11rnerv");
    		},
    		m(target, anchor) {
    			insert(target, select_layout, anchor);
    			mount_component(text0, select_layout, null);
    			append(select_layout, t);
    			mount_component(text1, select_layout, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text0_changes = {};

    			if (dirty & /*$$scope, selected, label*/ 131201) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope, icon*/ 131076) {
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

    function create_fragment$d(ctx) {
    	let controldrawer;
    	let t;
    	let button;
    	let current;

    	let controldrawer_props = {
    		persistent: /*persistent*/ ctx[1],
    		$$slots: { default: [create_default_slot_3$4] },
    		$$scope: { ctx }
    	};

    	controldrawer = new Control_drawer({ props: controldrawer_props });
    	/*controldrawer_binding*/ ctx[15](controldrawer);
    	const button_spread_levels = [{ variant: "outline" }, /*$$props*/ ctx[9], { disabled: /*disabled*/ ctx[3] }];

    	let button_props = {
    		$$slots: { default: [create_default_slot$6] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < button_spread_levels.length; i += 1) {
    		button_props = assign(button_props, button_spread_levels[i]);
    	}

    	button = new Button({ props: button_props });
    	button.$on("tap", /*tap_handler*/ ctx[16]);

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

    			const button_changes = (dirty & /*$$props, disabled*/ 520)
    			? get_spread_update(button_spread_levels, [
    					button_spread_levels[0],
    					dirty & /*$$props*/ 512 && get_spread_object(/*$$props*/ ctx[9]),
    					dirty & /*disabled*/ 8 && { disabled: /*disabled*/ ctx[3] }
    				])
    			: {};

    			if (dirty & /*$$scope, icon, selected, label*/ 131205) {
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
    			/*controldrawer_binding*/ ctx[15](null);
    			destroy_component(controldrawer, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    		$$invalidate(10, value = newValue);
    	};

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

    	const tap_handler = () => drawer.open();

    	$$self.$$set = $$new_props => {
    		$$invalidate(9, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('options' in $$new_props) $$invalidate(11, options = $$new_props.options);
    		if ('value' in $$new_props) $$invalidate(10, value = $$new_props.value);
    		if ('label' in $$new_props) $$invalidate(0, label = $$new_props.label);
    		if ('persistent' in $$new_props) $$invalidate(1, persistent = $$new_props.persistent);
    		if ('icon' in $$new_props) $$invalidate(2, icon = $$new_props.icon);
    		if ('disabled' in $$new_props) $$invalidate(3, disabled = $$new_props.disabled);
    		if ('searchable' in $$new_props) $$invalidate(4, searchable = $$new_props.searchable);
    		if ('$$scope' in $$new_props) $$invalidate(17, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options, filter*/ 2080) {
    			$$invalidate(12, shown = options.filter(opt => opt.label.toLowerCase().includes(filter.toLowerCase())));
    		}

    		if ($$self.$$.dirty & /*shown, value*/ 5120) {
    			$$invalidate(8, info = {
    				select,
    				options: shown,
    				currentValue: value
    			});
    		}

    		if ($$self.$$.dirty & /*options, value*/ 3072) {
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
    		$$props,
    		value,
    		options,
    		shown,
    		slots,
    		textinput_value_binding,
    		controldrawer_binding,
    		tap_handler,
    		$$scope
    	];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$d,
    			create_fragment$d,
    			safe_not_equal,
    			{
    				options: 11,
    				value: 10,
    				label: 0,
    				persistent: 1,
    				icon: 2,
    				disabled: 3,
    				searchable: 4
    			},
    			add_css$5
    		);
    	}
    }

    /* core\tabs.svelte generated by Svelte v3.44.2 */

    function add_css$4(target) {
    	append_styles(target, "svelte-x5vfy4", "doric-tabs.svelte-x5vfy4.svelte-x5vfy4{display:grid;grid-template-columns:repeat(var(--tabs), 1fr);background-color:var(--card-background);color:var(--text-normal)}doric-tabs.vertical.svelte-x5vfy4.svelte-x5vfy4{grid-template-columns:1fr;grid-template-rows:repeat(var(--tabs), 1fr)}tab-item.svelte-x5vfy4.svelte-x5vfy4{display:grid;border-width:0px;border-bottom-width:2px;border-style:solid;border-color:transparent}tab-item.selected.svelte-x5vfy4.svelte-x5vfy4{color:var(--primary);border-color:var(--primary)}.vertical.svelte-x5vfy4 tab-item.svelte-x5vfy4{border-bottom-width:0px;border-right-width:2px}tab-label.svelte-x5vfy4.svelte-x5vfy4{display:flex;align-items:center;justify-content:center;padding:8px 12px;font-size:var(--text-sixe-header)}tab-label.vertical.svelte-x5vfy4.svelte-x5vfy4{flex-direction:column}");
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (64:20) {#if option.icon}
    function create_if_block$1(ctx) {
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
    function create_default_slot$5(ctx) {
    	let tab_label;
    	let t0;
    	let span;
    	let t1_value = /*option*/ ctx[6].label + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[6].icon && create_if_block$1(ctx);

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
    					if_block = create_if_block$1(ctx);
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

    			if (dirty & /*iconTop*/ 8) {
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
    function create_each_block$3(key_1, ctx) {
    	let tab_item;
    	let actionarea;
    	let t;
    	let current;

    	actionarea = new Action_area({
    			props: {
    				$$slots: { default: [create_default_slot$5] },
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

    			if (dirty & /*options, tabGroup*/ 3) {
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

    function create_fragment$c(ctx) {
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
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
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
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, doric_tabs, outro_and_destroy_block, create_each_block$3, null, get_each_context$3);
    				check_outros();
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*tabCount*/ 16) vars_action.update.call(null, /*tabCount*/ ctx[4]);

    			if (dirty & /*vertical*/ 4) {
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

    function instance$c($$self, $$props, $$invalidate) {
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
    			instance$c,
    			create_fragment$c,
    			safe_not_equal,
    			{
    				tabGroup: 0,
    				options: 1,
    				vertical: 2,
    				iconTop: 3
    			},
    			add_css$4
    		);
    	}
    }

    /* core\layout\flex.svelte generated by Svelte v3.44.2 */

    function add_css$3(target) {
    	append_styles(target, "svelte-1vj1g5y", "flex-layout.svelte-1vj1g5y{display:flex;flex-wrap:nowrap;flex-direction:var(--direction);padding:var(--padding);gap:var(--gap);align-items:var(--item-align);justify-content:var(--item-justify);align-content:var(--content-align)}flex-layout.item-fill.svelte-1vj1g5y>*{flex-grow:1}flex-layout.scrollable.svelte-1vj1g5y{overflow:auto;-webkit-overflow-scrolling:touch;height:100%;scroll-behavior:auto}flex-layout.wrap.svelte-1vj1g5y{flex-wrap:wrap}flex-layout.center.svelte-1vj1g5y{align-items:center;justify-content:center}flex-layout.svelte-1vj1g5y>flex-break,flex-layout.item-fill.svelte-1vj1g5y>flex-break{flex-basis:100%;height:0;width:0}");
    }

    function create_fragment$b(ctx) {
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
    			set_custom_element_data(flex_layout, "class", "svelte-1vj1g5y");
    			toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[0]);
    			toggle_class(flex_layout, "scrollable", /*scrollable*/ ctx[1]);
    			toggle_class(flex_layout, "wrap", /*wrap*/ ctx[2]);
    			toggle_class(flex_layout, "center", /*center*/ ctx[3]);
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

    			if (dirty & /*itemFill*/ 1) {
    				toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[0]);
    			}

    			if (dirty & /*scrollable*/ 2) {
    				toggle_class(flex_layout, "scrollable", /*scrollable*/ ctx[1]);
    			}

    			if (dirty & /*wrap*/ 4) {
    				toggle_class(flex_layout, "wrap", /*wrap*/ ctx[2]);
    			}

    			if (dirty & /*center*/ 8) {
    				toggle_class(flex_layout, "center", /*center*/ ctx[3]);
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

    function instance$b($$self, $$props, $$invalidate) {
    	let flexVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { direction = "column" } = $$props;
    	let { padding = "4px" } = $$props;
    	let { gap = "4px" } = $$props;
    	let { itemFill = false } = $$props;
    	let { scrollable = false } = $$props;
    	let { wrap = false } = $$props;
    	let { itemAlign = null } = $$props;
    	let { itemJustify = null } = $$props;
    	let { contentAlign = null } = $$props;
    	let { center = false } = $$props;

    	$$self.$$set = $$props => {
    		if ('direction' in $$props) $$invalidate(5, direction = $$props.direction);
    		if ('padding' in $$props) $$invalidate(6, padding = $$props.padding);
    		if ('gap' in $$props) $$invalidate(7, gap = $$props.gap);
    		if ('itemFill' in $$props) $$invalidate(0, itemFill = $$props.itemFill);
    		if ('scrollable' in $$props) $$invalidate(1, scrollable = $$props.scrollable);
    		if ('wrap' in $$props) $$invalidate(2, wrap = $$props.wrap);
    		if ('itemAlign' in $$props) $$invalidate(8, itemAlign = $$props.itemAlign);
    		if ('itemJustify' in $$props) $$invalidate(9, itemJustify = $$props.itemJustify);
    		if ('contentAlign' in $$props) $$invalidate(10, contentAlign = $$props.contentAlign);
    		if ('center' in $$props) $$invalidate(3, center = $$props.center);
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
    		itemFill,
    		scrollable,
    		wrap,
    		center,
    		flexVars,
    		direction,
    		padding,
    		gap,
    		itemAlign,
    		itemJustify,
    		contentAlign,
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
    			instance$b,
    			create_fragment$b,
    			safe_not_equal,
    			{
    				direction: 5,
    				padding: 6,
    				gap: 7,
    				itemFill: 0,
    				scrollable: 1,
    				wrap: 2,
    				itemAlign: 8,
    				itemJustify: 9,
    				contentAlign: 10,
    				center: 3
    			},
    			add_css$3
    		);
    	}
    }

    /* core\layout\grid.svelte generated by Svelte v3.44.2 */

    function add_css$2(target) {
    	append_styles(target, "svelte-10j94a7", "grid-layout.svelte-10j94a7{display:grid;padding:var(--padding);gap:var(--gap);grid-auto-flow:var(--direction);grid-template-columns:var(--cols);grid-template-rows:var(--rows);grid-auto-columns:var(--autoCol);grid-auto-rows:var(--autoRow)}.scrollable.svelte-10j94a7{overflow:auto;-webkit-overflow-scrolling:touch;height:100%;scroll-behavior:auto}");
    }

    function create_fragment$a(ctx) {
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
    			set_custom_element_data(grid_layout, "class", "svelte-10j94a7");
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

    			if (dirty & /*scrollable*/ 1) {
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

    function instance$a($$self, $$props, $$invalidate) {
    	let flowVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { direction = "row" } = $$props;
    	let { padding = "4px" } = $$props;
    	let { gap = "4px" } = $$props;
    	let { cols = null } = $$props;
    	let { rows = null } = $$props;
    	let { autoRow = null } = $$props;
    	let { autoCol = null } = $$props;
    	let { scrollable = false } = $$props;

    	$$self.$$set = $$props => {
    		if ('direction' in $$props) $$invalidate(2, direction = $$props.direction);
    		if ('padding' in $$props) $$invalidate(3, padding = $$props.padding);
    		if ('gap' in $$props) $$invalidate(4, gap = $$props.gap);
    		if ('cols' in $$props) $$invalidate(5, cols = $$props.cols);
    		if ('rows' in $$props) $$invalidate(6, rows = $$props.rows);
    		if ('autoRow' in $$props) $$invalidate(7, autoRow = $$props.autoRow);
    		if ('autoCol' in $$props) $$invalidate(8, autoCol = $$props.autoCol);
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
    		direction,
    		padding,
    		gap,
    		cols,
    		rows,
    		autoRow,
    		autoCol,
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
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				direction: 2,
    				padding: 3,
    				gap: 4,
    				cols: 5,
    				rows: 6,
    				autoRow: 7,
    				autoCol: 8,
    				scrollable: 0
    			},
    			add_css$2
    		);
    	}
    }

    /* core\dialog\content.svelte generated by Svelte v3.44.2 */

    function add_css$1(target) {
    	append_styles(target, "svelte-1n2khek", "dialog-content.svelte-1n2khek{display:grid;position:absolute;top:var(--top);left:var(--left);transform:translate(\r\n            calc(var(--originX) * -1),\r\n            calc(var(--originY) * -1)\r\n        );width:var(--width);height:var(--height)}");
    }

    function create_fragment$9(ctx) {
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

    function instance$9($$self, $$props, $$invalidate) {
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
    			instance$9,
    			create_fragment$9,
    			safe_not_equal,
    			{
    				top: 1,
    				left: 2,
    				originX: 3,
    				originY: 4,
    				width: 5,
    				height: 6
    			},
    			add_css$1
    		);
    	}
    }

    /* core\theme\light.svelte generated by Svelte v3.44.2 */

    function create_fragment$8(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag();
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

    function instance$8($$self) {
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
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.44.2 */

    function create_fragment$7(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag();
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

    function instance$7($$self) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* core\theme\tron.svelte generated by Svelte v3.44.2 */

    function create_fragment$6(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_tag = new HtmlTag();
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

    function instance$6($$self) {
    	const theme = css`
        body {
            --font: Orbitron;
            --background: #030303;
            --background-layer: #080808;
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
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
        }
    `;

    	return [theme];
    }

    class Tron extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
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
        return style_element;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function append_hydration(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
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
    function claim_html_tag(nodes) {
        // find html opening tag
        const start_index = find_comment(nodes, 'HTML_TAG_START', 0);
        const end_index = find_comment(nodes, 'HTML_TAG_END', start_index);
        if (start_index === end_index) {
            return new HtmlTagHydration();
        }
        init_claim_info(nodes);
        const html_tag_nodes = nodes.splice(start_index, end_index + 1);
        detach(html_tag_nodes[0]);
        detach(html_tag_nodes[html_tag_nodes.length - 1]);
        const claimed_nodes = html_tag_nodes.slice(1, html_tag_nodes.length - 1);
        for (const n of claimed_nodes) {
            n.claim_order = nodes.claim_info.total_claimed;
            nodes.claim_info.total_claimed += 1;
        }
        return new HtmlTagHydration(claimed_nodes);
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
        node.style.setProperty(key, value, important ? 'important' : '');
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
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    function query_selector_all(selector, parent = document.body) {
        return Array.from(parent.querySelectorAll(selector));
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
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
        constructor(claimed_nodes) {
            super();
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
        const doc = get_root_for_style(node);
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = append_empty_stylesheet(node).sheet);
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
        exports.raf(() => {
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
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    function getAllContexts() {
        return get_current_component().$$.context;
    }
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
        'ismap',
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

    const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
    // https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
    // https://infra.spec.whatwg.org/#noncharacter
    function spread(args, classes_to_add) {
        const attributes = Object.assign({}, ...args);
        if (classes_to_add) {
            if (attributes.class == null) {
                attributes.class = classes_to_add;
            }
            else {
                attributes.class += ' ' + classes_to_add;
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
    const escaped = {
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    function escape(html) {
        return String(html).replace(/["'&<>]/g, match => escaped[match]);
    }
    function escape_attribute_value(value) {
        return typeof value === 'string' ? escape(value) : value;
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
            throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
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
        return ` ${name}${value === true ? '' : `=${typeof value === 'string' ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
    }
    function add_classes(classes) {
        return classes ? ` class="${classes}"` : '';
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
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
            ctx: null,
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.2' }, detail), true));
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
    exports.escaped = escaped;
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
    exports.listen = listen;
    exports.listen_dev = listen_dev;
    exports.loop = loop;
    exports.loop_guard = loop_guard;
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
    exports.validate_each_argument = validate_each_argument;
    exports.validate_each_keys = validate_each_keys;
    exports.validate_slots = validate_slots;
    exports.validate_store = validate_store;
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
    const dialog = {
        show: showDialog,
    };

    /* demo\src\test\theme-picker.svelte generated by Svelte v3.44.2 */

    function create_fragment$5(ctx) {
    	let tabs;
    	let updating_tabGroup;
    	let current;

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[3](value);
    	}

    	let tabs_props = {
    		options: /*themes*/ ctx[2],
    		vertical: /*vertical*/ ctx[0]
    	};

    	if (/*$currentTheme*/ ctx[1] !== void 0) {
    		tabs_props.tabGroup = /*$currentTheme*/ ctx[1];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, 'tabGroup', tabs_tabGroup_binding));

    	return {
    		c() {
    			create_component(tabs.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const tabs_changes = {};
    			if (dirty & /*vertical*/ 1) tabs_changes.vertical = /*vertical*/ ctx[0];

    			if (!updating_tabGroup && dirty & /*$currentTheme*/ 2) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*$currentTheme*/ ctx[1];
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

    const currentTheme = writable(localStorage.theme ?? "light");

    const themeMap = {
    	light: Light,
    	dark: Dark,
    	tron: Tron
    };

    const theme = derived(currentTheme, current => themeMap[current]);
    currentTheme.subscribe(themeName => localStorage.theme = themeName);

    function instance$5($$self, $$props, $$invalidate) {
    	let $currentTheme,
    		$$unsubscribe_currentTheme = noop;

    	component_subscribe($$self, currentTheme, $$value => $$invalidate(1, $currentTheme = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_currentTheme());
    	let { vertical } = $$props;

    	const themes = [
    		{
    			label: "Light",
    			icon: "sun",
    			value: "light"
    		},
    		{
    			label: "Dark",
    			icon: "moon",
    			value: "dark"
    		},
    		{
    			label: "Tron",
    			icon: "laptop",
    			value: "tron"
    		}
    	];

    	function tabs_tabGroup_binding(value) {
    		$currentTheme = value;
    		currentTheme.set($currentTheme);
    	}

    	$$self.$$set = $$props => {
    		if ('vertical' in $$props) $$invalidate(0, vertical = $$props.vertical);
    	};

    	return [vertical, $currentTheme, themes, tabs_tabGroup_binding];
    }

    class Theme_picker extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { vertical: 0 });
    	}
    }

    /* demo\src\test\select-dialog.svelte generated by Svelte v3.44.2 */

    function create_default_slot_7$1(ctx) {
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

    // (45:12) <Flex direction="column">
    function create_default_slot_6$2(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text({
    			props: {
    				$$slots: { default: [create_default_slot_7$1] },
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

    			if (dirty & /*$$scope, message*/ 514) {
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

    // (44:8) <Paper flat scrollable>
    function create_default_slot_5$2(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_6$2] },
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

    			if (dirty & /*$$scope, message*/ 514) {
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

    // (33:4) <Paper card>
    function create_default_slot_4$3(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				flat: true,
    				scrollable: true,
    				$$slots: { default: [create_default_slot_5$2] },
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

    			if (dirty & /*$$scope, message*/ 514) {
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

    // (35:12) {#if title}
    function create_if_block(ctx) {
    	let titlebar;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				compact: true,
    				$$slots: { default: [create_default_slot_3$3] },
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

    			if (dirty & /*$$scope, title, icon*/ 521) {
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

    // (37:20) {#if icon}
    function create_if_block_1(ctx) {
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

    // (36:16) <TitleBar compact>
    function create_default_slot_3$3(ctx) {
    	let t0;
    	let t1;
    	let current;
    	let if_block = /*icon*/ ctx[3] && create_if_block_1(ctx);

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
    					if_block = create_if_block_1(ctx);
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

    // (34:8) <svelte:fragment slot="title">
    function create_title_slot$2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*title*/ ctx[0] && create_if_block(ctx);

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
    					if_block = create_if_block(ctx);
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

    // (53:12) <Button color="secondary" on:tap={ok}>
    function create_default_slot_2$3(ctx) {
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

    // (51:8) <Grid slot="action">
    function create_default_slot_1$4(ctx) {
    	let select;
    	let updating_value;
    	let t;
    	let button;
    	let current;

    	function select_value_binding(value) {
    		/*select_value_binding*/ ctx[8](value);
    	}

    	let select_props = { label: "Test", options: /*items*/ ctx[5] };

    	if (/*value*/ ctx[4] !== void 0) {
    		select_props.value = /*value*/ ctx[4];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, 'value', select_value_binding));

    	button = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_2$3] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*ok*/ ctx[6]);

    	return {
    		c() {
    			create_component(select.$$.fragment);
    			t = space();
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(select, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const select_changes = {};

    			if (!updating_value && dirty & /*value*/ 16) {
    				updating_value = true;
    				select_changes.value = /*value*/ ctx[4];
    				add_flush_callback(() => updating_value = false);
    			}

    			select.$set(select_changes);
    			const button_changes = {};

    			if (dirty & /*$$scope, okText*/ 516) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(select, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (51:8) 
    function create_action_slot$1(ctx) {
    	let grid;
    	let current;

    	grid = new Grid({
    			props: {
    				slot: "action",
    				$$slots: { default: [create_default_slot_1$4] },
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

    			if (dirty & /*$$scope, okText, value*/ 532) {
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

    // (32:0) <DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    function create_default_slot$4(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				card: true,
    				$$slots: {
    					action: [create_action_slot$1],
    					title: [create_title_slot$2],
    					default: [create_default_slot_4$3]
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

    			if (dirty & /*$$scope, okText, value, title, icon, message*/ 543) {
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

    function create_fragment$4(ctx) {
    	let dialogcontent;
    	let current;

    	dialogcontent = new Content({
    			props: {
    				top: "25%",
    				left: "50%",
    				originX: "50%",
    				width: "min(70vw, 320px)",
    				$$slots: { default: [create_default_slot$4] },
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

    			if (dirty & /*$$scope, okText, value, title, icon, message*/ 543) {
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { close } = $$props;
    	let { title = "Alert" } = $$props;
    	let { message } = $$props;
    	let { okText = "OK" } = $$props;
    	let { icon } = $$props;
    	let value = 0;

    	const items = [
    		{ label: "First", value: 0 },
    		{ label: "Second", value: 1 },
    		{ label: "Third", value: 2 }
    	];

    	const ok = () => close(true);

    	function select_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(4, value);
    	}

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(7, close = $$props.close);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('message' in $$props) $$invalidate(1, message = $$props.message);
    		if ('okText' in $$props) $$invalidate(2, okText = $$props.okText);
    		if ('icon' in $$props) $$invalidate(3, icon = $$props.icon);
    	};

    	return [title, message, okText, icon, value, items, ok, close, select_value_binding];
    }

    class Select_dialog extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			close: 7,
    			title: 0,
    			message: 1,
    			okText: 2,
    			icon: 3
    		});
    	}
    }

    /* demo\src\app-menu.svelte generated by Svelte v3.44.2 */

    function create_default_slot_1$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Cancel");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (17:0) <Flex padding="0px">
    function create_default_slot$3(ctx) {
    	let themepicker;
    	let t;
    	let button;
    	let current;
    	themepicker = new Theme_picker({ props: { vertical: true } });

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*tap_handler*/ ctx[2]);

    	return {
    		c() {
    			create_component(themepicker.$$.fragment);
    			t = space();
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(themepicker, target, anchor);
    			insert(target, t, anchor);
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(themepicker.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(themepicker.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(themepicker, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				padding: "0px",
    				$$slots: { default: [create_default_slot$3] },
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
    		p(ctx, [dirty]) {
    			const flex_changes = {};

    			if (dirty & /*$$scope, close*/ 17) {
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

    function instance$3($$self, $$props, $$invalidate) {
    	let $currentTheme;
    	component_subscribe($$self, currentTheme, $$value => $$invalidate(1, $currentTheme = $$value));
    	let { close } = $$props;
    	const current = $currentTheme;
    	const tap_handler = () => close();

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(0, close = $$props.close);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$currentTheme, close*/ 3) {
    			if ($currentTheme !== current) {
    				close($currentTheme);
    			}
    		}
    	};

    	return [close, $currentTheme, tap_handler];
    }

    class App_menu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { close: 0 });
    	}
    }

    /* demo\src\test\subscreen2.svelte generated by Svelte v3.44.2 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (18:16) {#each Array.from({ length: 20 }) as _, index}
    function create_each_block$2(ctx) {
    	let area_view;
    	let t;

    	return {
    		c() {
    			area_view = element("area-view");
    			t = text(/*index*/ ctx[5]);
    			set_style(area_view, "position", "sticky");
    			set_style(area_view, "top", "0px");
    		},
    		m(target, anchor) {
    			insert(target, area_view, anchor);
    			append(area_view, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(area_view);
    		}
    	};
    }

    // (23:16) <Button on:tap={close}>
    function create_default_slot_4$2(ctx) {
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

    // (17:12) <Flex scrollable>
    function create_default_slot_3$2(ctx) {
    	let t;
    	let button;
    	let current;
    	let each_value = Array.from({ length: 20 });
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*close*/ ctx[1]);

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
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t);
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (16:8) <Paper square card>
    function create_default_slot_2$2(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				scrollable: true,
    				$$slots: { default: [create_default_slot_3$2] },
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

    			if (dirty & /*$$scope*/ 64) {
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

    // (15:4) <Flex padding="0px">
    function create_default_slot_1$2(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				square: true,
    				card: true,
    				$$slots: { default: [create_default_slot_2$2] },
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

    			if (dirty & /*$$scope*/ 64) {
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

    // (14:0) <Screen bind:this={scr}>
    function create_default_slot$2(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				padding: "0px",
    				$$slots: { default: [create_default_slot_1$2] },
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

    			if (dirty & /*$$scope*/ 64) {
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

    function create_fragment$2(ctx) {
    	let screen;
    	let current;

    	let screen_props = {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	screen = new Screen({ props: screen_props });
    	/*screen_binding*/ ctx[2](screen);

    	return {
    		c() {
    			create_component(screen.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(screen, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const screen_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				screen_changes.$$scope = { dirty, ctx };
    			}

    			screen.$set(screen_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(screen.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(screen.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*screen_binding*/ ctx[2](null);
    			destroy_component(screen, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let scr = null;
    	const close = () => scr.close();

    	function screen_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			scr = $$value;
    			$$invalidate(0, scr);
    		});
    	}

    	return [scr, close, screen_binding];
    }

    class Subscreen2 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* demo\src\test\subscreen.svelte generated by Svelte v3.44.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (28:12) <Button on:tap={open}>
    function create_default_slot_6$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Next");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (31:12) {#each Array.from({ length: 20 }) as _, index}
    function create_each_block$1(ctx) {
    	let area_view;
    	let t;

    	return {
    		c() {
    			area_view = element("area-view");
    			t = text(/*index*/ ctx[7]);
    			set_style(area_view, "position", "sticky");
    			set_style(area_view, "top", "0px");
    		},
    		m(target, anchor) {
    			insert(target, area_view, anchor);
    			append(area_view, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(area_view);
    		}
    	};
    }

    // (36:12) <Button on:tap={() => scr.close(new Date().toLocaleString())}>
    function create_default_slot_5$1(ctx) {
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

    // (27:8) <Flex scrollable center>
    function create_default_slot_4$1(ctx) {
    	let button0;
    	let t0;
    	let t1;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("tap", /*open*/ ctx[2]);
    	let each_value = Array.from({ length: 20 });
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	button1 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("tap", /*tap_handler*/ ctx[3]);

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			create_component(button1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t1, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
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
    			if (detaching) detach(t0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t1);
    			destroy_component(button1, detaching);
    		}
    	};
    }

    // (26:4) <Paper square card>
    function create_default_slot_3$1(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				scrollable: true,
    				center: true,
    				$$slots: { default: [create_default_slot_4$1] },
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

    			if (dirty & /*$$scope, scr*/ 258) {
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

    // (22:0) <Screen bind:this={scr}>
    function create_default_slot_2$1(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				square: true,
    				card: true,
    				$$slots: { default: [create_default_slot_3$1] },
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

    			if (dirty & /*$$scope, scr*/ 258) {
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

    // (23:4) <AppBar slot="title">
    function create_default_slot_1$1(ctx) {
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text("Testing - #");
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

    // (23:4) 
    function create_title_slot$1(ctx) {
    	let appbar;
    	let current;

    	appbar = new App_bar({
    			props: {
    				slot: "title",
    				$$slots: { default: [create_default_slot_1$1] },
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

    			if (dirty & /*$$scope, value*/ 257) {
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

    // (42:4) <Footer slot="footer" bordered>
    function create_default_slot$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Some kind of footery stuff");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (42:4) 
    function create_footer_slot$1(ctx) {
    	let footer;
    	let current;

    	footer = new Footer({
    			props: {
    				slot: "footer",
    				bordered: true,
    				$$slots: { default: [create_default_slot$1] },
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

    			if (dirty & /*$$scope*/ 256) {
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

    function create_fragment$1(ctx) {
    	let screen;
    	let current;

    	let screen_props = {
    		$$slots: {
    			footer: [create_footer_slot$1],
    			title: [create_title_slot$1],
    			default: [create_default_slot_2$1]
    		},
    		$$scope: { ctx }
    	};

    	screen = new Screen({ props: screen_props });
    	/*screen_binding*/ ctx[4](screen);

    	return {
    		c() {
    			create_component(screen.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(screen, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const screen_changes = {};

    			if (dirty & /*$$scope, value, scr*/ 259) {
    				screen_changes.$$scope = { dirty, ctx };
    			}

    			screen.$set(screen_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(screen.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(screen.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*screen_binding*/ ctx[4](null);
    			destroy_component(screen, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	let scr = null;
    	const open = () => scr.openStack(Subscreen2);
    	const tap_handler = () => scr.close(new Date().toLocaleString());

    	function screen_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			scr = $$value;
    			$$invalidate(1, scr);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [value, scr, open, tap_handler, screen_binding];
    }

    class Subscreen extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { value: 0 });
    	}
    }

    /* demo\src\app.svelte generated by Svelte v3.44.2 */

    function add_css(target) {
    	append_styles(target, "svelte-1ti9jph", "area-view.svelte-1ti9jph{display:block;background-color:teal;border:1px solid white;min-height:54px}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[12] = i;
    	return child_ctx;
    }

    // (135:20) <Text>
    function create_default_slot_17(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("wat");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (136:20) <Text>
    function create_default_slot_16(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("woah");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (137:20) <Text textColor="teal">
    function create_default_slot_15(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("nope");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (134:16) <Flex center>
    function create_default_slot_14(ctx) {
    	let text0;
    	let t0;
    	let text1;
    	let t1;
    	let text2;
    	let current;

    	text0 = new Text({
    			props: {
    				$$slots: { default: [create_default_slot_17] },
    				$$scope: { ctx }
    			}
    		});

    	text1 = new Text({
    			props: {
    				$$slots: { default: [create_default_slot_16] },
    				$$scope: { ctx }
    			}
    		});

    	text2 = new Text({
    			props: {
    				textColor: "teal",
    				$$slots: { default: [create_default_slot_15] },
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

    			if (dirty & /*$$scope*/ 32768) {
    				text0_changes.$$scope = { dirty, ctx };
    			}

    			text0.$set(text0_changes);
    			const text1_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				text1_changes.$$scope = { dirty, ctx };
    			}

    			text1.$set(text1_changes);
    			const text2_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
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

    // (140:12) <Button on:tap={turnOn} variant="outline" buttonColor="gold">
    function create_default_slot_13(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Open");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (143:12) <Button on:tap={openDialog}>
    function create_default_slot_12(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("dialog");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (147:16) <Text slot="selected">
    function create_default_slot_11(ctx) {
    	let t0;
    	let t1_value = /*selected*/ ctx[13].label + "";
    	let t1;

    	return {
    		c() {
    			t0 = text("Current Item: ");
    			t1 = text(t1_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selected*/ 8192 && t1_value !== (t1_value = /*selected*/ ctx[13].label + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (147:16) 
    function create_selected_slot(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text({
    			props: {
    				slot: "selected",
    				$$slots: { default: [create_default_slot_11] },
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

    			if (dirty & /*$$scope, selected*/ 40960) {
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

    // (150:16) 
    function create_options_slot(ctx) {
    	let optionlist;
    	let current;

    	optionlist = new Option_list({
    			props: {
    				info: /*info*/ ctx[14],
    				variant: "fill",
    				color: "secondary",
    				slot: "options"
    			}
    		});

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
    			if (dirty & /*info*/ 16384) optionlist_changes.info = /*info*/ ctx[14];
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

    // (153:16) {#each Array.from({ length: 60 }) as _, index}
    function create_each_block(ctx) {
    	let area_view;
    	let t0;
    	let t1;

    	return {
    		c() {
    			area_view = element("area-view");
    			t0 = text(/*index*/ ctx[12]);
    			t1 = space();
    			set_style(area_view, "position", "sticky");
    			set_style(area_view, "top", "0px");
    			set_custom_element_data(area_view, "class", "svelte-1ti9jph");
    		},
    		m(target, anchor) {
    			insert(target, area_view, anchor);
    			append(area_view, t0);
    			append(area_view, t1);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(area_view);
    		}
    	};
    }

    // (152:12) <Grid cols="repeat(3, 1fr)" autoRow="60px" scrollable>
    function create_default_slot_10(ctx) {
    	let each_1_anchor;
    	let each_value = Array.from({ length: 60 });
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    		p: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (132:8) <Flex scrollable>
    function create_default_slot_9(ctx) {
    	let div;
    	let flex;
    	let t0;
    	let button0;
    	let t1;
    	let button1;
    	let t2;
    	let select;
    	let updating_value;
    	let t3;
    	let grid;
    	let current;

    	flex = new Flex({
    			props: {
    				center: true,
    				$$slots: { default: [create_default_slot_14] },
    				$$scope: { ctx }
    			}
    		});

    	button0 = new Button({
    			props: {
    				variant: "outline",
    				buttonColor: "gold",
    				$$slots: { default: [create_default_slot_13] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("tap", /*turnOn*/ ctx[5]);

    	button1 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("tap", /*openDialog*/ ctx[4]);

    	function select_value_binding(value) {
    		/*select_value_binding*/ ctx[7](value);
    	}

    	let select_props = {
    		options: /*options*/ ctx[3],
    		label: "Test Label",
    		persistent: true,
    		searchable: true,
    		$$slots: {
    			options: [
    				create_options_slot,
    				({ selected, info }) => ({ 13: selected, 14: info }),
    				({ selected, info }) => (selected ? 8192 : 0) | (info ? 16384 : 0)
    			],
    			selected: [
    				create_selected_slot,
    				({ selected, info }) => ({ 13: selected, 14: info }),
    				({ selected, info }) => (selected ? 8192 : 0) | (info ? 16384 : 0)
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		select_props.value = /*value*/ ctx[0];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, 'value', select_value_binding));

    	grid = new Grid({
    			props: {
    				cols: "repeat(3, 1fr)",
    				autoRow: "60px",
    				scrollable: true,
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(flex.$$.fragment);
    			t0 = space();
    			create_component(button0.$$.fragment);
    			t1 = space();
    			create_component(button1.$$.fragment);
    			t2 = space();
    			create_component(select.$$.fragment);
    			t3 = space();
    			create_component(grid.$$.fragment);
    			set_style(div, "display", "grid");
    			set_style(div, "height", "100px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(flex, div, null);
    			insert(target, t0, anchor);
    			mount_component(button0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(button1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(select, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(grid, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flex_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const select_changes = {};

    			if (dirty & /*$$scope, info, selected*/ 57344) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				select_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			select.$set(select_changes);
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flex.$$.fragment, local);
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(select.$$.fragment, local);
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flex.$$.fragment, local);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(select.$$.fragment, local);
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(flex);
    			if (detaching) detach(t0);
    			destroy_component(button0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(button1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(select, detaching);
    			if (detaching) detach(t3);
    			destroy_component(grid, detaching);
    		}
    	};
    }

    // (131:4) <Paper square card borderColor="cyan">
    function create_default_slot_8(ctx) {
    	let flex;
    	let current;

    	flex = new Flex({
    			props: {
    				scrollable: true,
    				$$slots: { default: [create_default_slot_9] },
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

    			if (dirty & /*$$scope, value*/ 32769) {
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

    // (110:0) <Screen bind:this={mainScreen}>
    function create_default_slot_7(ctx) {
    	let paper;
    	let current;

    	paper = new Paper({
    			props: {
    				square: true,
    				card: true,
    				borderColor: "cyan",
    				$$slots: { default: [create_default_slot_8] },
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

    			if (dirty & /*$$scope, value*/ 32769) {
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

    // (111:4) <AppBar fixed slot="title">
    function create_default_slot_6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Doric Components Testing");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (115:12) <Button on:tap={openMenu} compact>
    function create_default_slot_5(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "burger", size: "20px" } });

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

    // (114:8) <Adornment slot="menu" flush>
    function create_default_slot_4(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				compact: true,
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*openMenu*/ ctx[6]);

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

    			if (dirty & /*$$scope*/ 32768) {
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

    // (114:8) 
    function create_menu_slot(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				slot: "menu",
    				flush: true,
    				$$slots: { default: [create_default_slot_4] },
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

    			if (dirty & /*$$scope*/ 32768) {
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

    // (121:12) <Button>
    function create_default_slot_3(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: {
    				name: "arrow-right-from-bracket",
    				size: "16px"
    			}
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

    // (120:8) <Adornment slot="action">
    function create_default_slot_2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
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

    			if (dirty & /*$$scope*/ 32768) {
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

    // (120:8) 
    function create_action_slot(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				slot: "action",
    				$$slots: { default: [create_default_slot_2] },
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

    			if (dirty & /*$$scope*/ 32768) {
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

    // (126:8) <Adornment slot="extension" flush>
    function create_default_slot_1(ctx) {
    	let themepicker;
    	let current;
    	themepicker = new Theme_picker({});

    	return {
    		c() {
    			create_component(themepicker.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(themepicker, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(themepicker.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(themepicker.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(themepicker, detaching);
    		}
    	};
    }

    // (126:8) 
    function create_extension_slot(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				slot: "extension",
    				flush: true,
    				$$slots: { default: [create_default_slot_1] },
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

    			if (dirty & /*$$scope*/ 32768) {
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

    // (111:4) 
    function create_title_slot(ctx) {
    	let appbar;
    	let current;

    	appbar = new App_bar({
    			props: {
    				fixed: true,
    				slot: "title",
    				$$slots: {
    					extension: [create_extension_slot],
    					action: [create_action_slot],
    					menu: [create_menu_slot],
    					default: [create_default_slot_6]
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

    			if (dirty & /*$$scope*/ 32768) {
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

    // (162:4) <Footer slot="footer" bordered borderColor="pink">
    function create_default_slot(ctx) {
    	let themepicker;
    	let current;
    	themepicker = new Theme_picker({});

    	return {
    		c() {
    			create_component(themepicker.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(themepicker, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(themepicker.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(themepicker.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(themepicker, detaching);
    		}
    	};
    }

    // (162:4) 
    function create_footer_slot(ctx) {
    	let footer;
    	let current;

    	footer = new Footer({
    			props: {
    				slot: "footer",
    				bordered: true,
    				borderColor: "pink",
    				$$slots: { default: [create_default_slot] },
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

    			if (dirty & /*$$scope*/ 32768) {
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

    function create_fragment(ctx) {
    	let appstyle;
    	let t;
    	let screen;
    	let current;

    	appstyle = new App_style({
    			props: { baseline: Baseline, theme: /*$theme*/ ctx[2] }
    		});

    	let screen_props = {
    		$$slots: {
    			footer: [create_footer_slot],
    			title: [create_title_slot],
    			default: [create_default_slot_7]
    		},
    		$$scope: { ctx }
    	};

    	screen = new Screen({ props: screen_props });
    	/*screen_binding*/ ctx[8](screen);

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
    			if (dirty & /*$theme*/ 4) appstyle_changes.theme = /*$theme*/ ctx[2];
    			appstyle.$set(appstyle_changes);
    			const screen_changes = {};

    			if (dirty & /*$$scope, value*/ 32769) {
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
    			/*screen_binding*/ ctx[8](null);
    			destroy_component(screen, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $theme;
    	component_subscribe($$self, theme, $$value => $$invalidate(2, $theme = $$value));
    	let value = 1;
    	const options = Array.from({ length: 50 }, (_, i) => ({ label: `Option #${i}`, value: i }));

    	// const options = [
    	//     { label: "Some Longer Employee Name", value: 0},
    	//     { label: "test 2", value: 1},
    	//     { label: "test 3", value: 2},
    	// ]
    	const openDialog = async () => {
    		console.log(await dialog.show(Select_dialog, {
    			title: "Testing",
    			message: "Select?",
    			persistent: true
    		}));
    	};

    	let mainScreen = null;
    	const turnOn = () => mainScreen.openStack(Subscreen, { value: new Date().toLocaleString() });

    	const openThing = value => {
    		if (mainScreen === null) {
    			return;
    		}

    		mainScreen.openStack(Subscreen, { value }).then(console.log);
    	};

    	const openMenu = async () => {
    		console.log(await drawer.open(App_menu, { theme }));
    	};

    	function select_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function screen_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			mainScreen = $$value;
    			$$invalidate(1, mainScreen);
    		});
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 1) {
    			openThing(value);
    		}
    	};

    	return [
    		value,
    		mainScreen,
    		$theme,
    		options,
    		openDialog,
    		turnOn,
    		openMenu,
    		select_value_binding,
    		screen_binding
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
    	}
    }

    var main = new App({
        target: document.body,
    });

    return main;

}());
