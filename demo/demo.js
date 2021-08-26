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
        node.style.setProperty(key, value, important ? 'important' : '');
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
    function hash$1(str) {
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
        const name = `__svelte_${hash$1(rule)}_${uid}`;
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
                evt.identifier = evt.identifier ?? -1;
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
                evt.identifier = evt.identifier ?? -1;
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

    /* core\app-style.svelte generated by Svelte v3.38.2 */

    function create_fragment$v(ctx) {
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

    function instance$t($$self, $$props, $$invalidate) {
    	let { theme = null } = $$props;
    	let { baseline = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("baseline" in $$props) $$invalidate(1, baseline = $$props.baseline);
    	};

    	return [theme, baseline];
    }

    class App_style extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$t, create_fragment$v, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

    /* core\baseline.svelte generated by Svelte v3.38.2 */

    function add_css$o() {
    	var style = element("style");
    	style.id = "svelte-74u6mc-style";
    	style.textContent = "*{box-sizing:border-box}html{margin:0px;padding:0px;width:100%;height:100%}body{margin:0px;padding:0px;width:100%;height:100%;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--layer-border-color);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert)}";
    	append(document.head, style);
    }

    function create_fragment$u(ctx) {
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
    		if (!document.getElementById("svelte-74u6mc-style")) add_css$o();
    		init(this, options, null, create_fragment$u, safe_not_equal, {});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

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
    css.default = css;

    var css_1 = css;

    /* core\theme\light.svelte generated by Svelte v3.38.2 */

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

    function instance$s($$self) {
    	const theme = css_1`
        body {
            --font: Roboto;
            --background: #e9e9e9;
            --background-layer: #ffffff;
            --layer-border-width: 1px;
            --layer-border-color: #eeeeee;

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
    		init(this, options, instance$s, create_fragment$t, safe_not_equal, {});
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.38.2 */

    function create_fragment$s(ctx) {
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
    	const theme = css_1`
        body {
            --font: Inconsolata;
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
    		init(this, options, instance$r, create_fragment$s, safe_not_equal, {});
    	}
    }

    /* core\theme\tron.svelte generated by Svelte v3.38.2 */

    function create_fragment$r(ctx) {
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

    function instance$q($$self) {
    	const theme = css_1`
        body {
            --font: Inconsolata;
            --background: #030303;
            --background-layer: #080808;
            --layer-border-width: 2px;
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
    		init(this, options, instance$q, create_fragment$r, safe_not_equal, {});
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

    var vars_1 = vars;

    /* core\adornment.svelte generated by Svelte v3.38.2 */

    function add_css$n() {
    	var style = element("style");
    	style.id = "svelte-1w7mv94-style";
    	style.textContent = "doric-adornment.svelte-1w7mv94{display:grid;grid-area:var(--position)}";
    	append(document.head, style);
    }

    function create_fragment$q(ctx) {
    	let doric_adornment;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			doric_adornment = element("doric-adornment");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_adornment, "class", "svelte-1w7mv94");
    		},
    		m(target, anchor) {
    			insert(target, doric_adornment, anchor);

    			if (default_slot) {
    				default_slot.m(doric_adornment, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, doric_adornment, /*positionVars*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*positionVars*/ 1) vars_action.update.call(null, /*positionVars*/ ctx[0]);
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
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let positionVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { position = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(1, position = $$props.position);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*position*/ 2) {
    			$$invalidate(0, positionVars = { position: `${position}-adornment` });
    		}
    	};

    	return [positionVars, position, $$scope, slots];
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1w7mv94-style")) add_css$n();
    		init(this, options, instance$p, create_fragment$q, safe_not_equal, { position: 1 });
    	}
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

    /* core\ripple.svelte generated by Svelte v3.38.2 */

    function add_css$m() {
    	var style = element("style");
    	style.id = "svelte-acwzgw-style";
    	style.textContent = "ripple-wrapper.svelte-acwzgw{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-acwzgw{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}";
    	append(document.head, style);
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (107:4) {#each ripples as info (info.id)}
    function create_each_block$2(key_1, ctx) {
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
    				dispose = action_destroyer(vars_action = vars_1.call(null, ripple, /*rippleVars*/ ctx[4](/*info*/ ctx[8], /*color*/ ctx[0])));
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

    function create_fragment$p(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[8].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
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
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block$2, null, get_each_context$2);
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

    const duration = 500;

    function instance$o($$self, $$props, $$invalidate) {
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
    			setTimeout(() => $$invalidate(1, ripples = ripples.filter(r => r !== ripple)), duration);
    		}
    	};

    	const rippleVars = (info, color) => ({
    		"x": [info.x, "px"],
    		"y": [info.y, "px"],
    		"size": [info.size, "px"],
    		"ripple-color": color
    	});

    	function ripple_wrapper_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(2, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(5, disabled = $$props.disabled);
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
    		if (!document.getElementById("svelte-acwzgw-style")) add_css$m();
    		init(this, options, instance$o, create_fragment$p, safe_not_equal, { color: 0, disabled: 5 });
    	}
    }

    /* core\button.svelte generated by Svelte v3.38.2 */

    function add_css$l() {
    	var style = element("style");
    	style.id = "svelte-k4pik7-style";
    	style.textContent = "doric-button.svelte-k4pik7{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;z-index:+1;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}.round.svelte-k4pik7{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.fab.svelte-k4pik7{width:var(--button-round-size);padding:0px}.disabled.svelte-k4pik7{filter:contrast(50%)}.primary.svelte-k4pik7{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-k4pik7{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-k4pik7{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-k4pik7{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--text-color)}.outline.svelte-k4pik7{border:1px solid var(--button-color);color:var(--button-color)}";
    	append(document.head, style);
    }

    function create_fragment$o(ctx) {
    	let doric_button;
    	let t;
    	let ripple;
    	let doric_button_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[2] } });

    	return {
    		c() {
    			doric_button = element("doric-button");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(doric_button, "class", doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[5] + " svelte-k4pik7"));
    			toggle_class(doric_button, "disabled", /*disabled*/ ctx[2]);
    			toggle_class(doric_button, "round", /*round*/ ctx[3]);
    			toggle_class(doric_button, "fab", /*fab*/ ctx[4]);
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
    					listen(doric_button, "tap", /*handleTap*/ ctx[7]),
    					action_destroyer(vars_action = vars_1.call(null, doric_button, /*buttonVars*/ ctx[6]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 4) ripple_changes.disabled = /*disabled*/ ctx[2];
    			ripple.$set(ripple_changes);

    			if (!current || dirty & /*color, variant, klass*/ 35 && doric_button_class_value !== (doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[5] + " svelte-k4pik7"))) {
    				set_custom_element_data(doric_button, "class", doric_button_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 64) vars_action.update.call(null, /*buttonVars*/ ctx[6]);

    			if (dirty & /*color, variant, klass, disabled*/ 39) {
    				toggle_class(doric_button, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*color, variant, klass, round*/ 43) {
    				toggle_class(doric_button, "round", /*round*/ ctx[3]);
    			}

    			if (dirty & /*color, variant, klass, fab*/ 51) {
    				toggle_class(doric_button, "fab", /*fab*/ ctx[4]);
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
    	let { variant = "normal" } = $$props;
    	let { disabled = false } = $$props;
    	let { round } = $$props;
    	let { fab } = $$props;
    	let { class: klass = "" } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		// Mobile browsers don't like dispatching events inside custom events
    		setTimeout(() => dispatch("tap", evt), 0);
    	};

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("variant" in $$props) $$invalidate(1, variant = $$props.variant);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    		if ("round" in $$props) $$invalidate(3, round = $$props.round);
    		if ("fab" in $$props) $$invalidate(4, fab = $$props.fab);
    		if ("class" in $$props) $$invalidate(5, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*round*/ 8) {
    			$$invalidate(6, buttonVars = { "button-round-size": round });
    		}
    	};

    	return [
    		color,
    		variant,
    		disabled,
    		round,
    		fab,
    		klass,
    		buttonVars,
    		handleTap,
    		$$scope,
    		slots
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-k4pik7-style")) add_css$l();

    		init(this, options, instance$n, create_fragment$o, safe_not_equal, {
    			color: 0,
    			variant: 1,
    			disabled: 2,
    			round: 3,
    			fab: 4,
    			class: 5
    		});
    	}
    }

    /* core\card.svelte generated by Svelte v3.38.2 */

    function add_css$k() {
    	var style = element("style");
    	style.id = "svelte-1uu6vyg-style";
    	style.textContent = "doric-card.svelte-1uu6vyg{display:grid;border-radius:4px;border-style:solid;box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25);grid-template-rows:min-content auto;overflow:hidden;background-color:var(--card-background);border-color:var(--border-color, var(--layer-border-color));border-width:var(--layer-border-width)}card-title.svelte-1uu6vyg{display:flex;align-items:center;user-select:none;min-height:28px;padding:4px;font-size:var(--text-size-header);border-bottom:1px solid var(--border-color, var(--layer-border-color))}";
    	append(document.head, style);
    }

    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});

    // (41:4) {#if $$slots.title}
    function create_if_block$4(ctx) {
    	let card_title;
    	let current;
    	const title_slot_template = /*#slots*/ ctx[5].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[4], get_title_slot_context);

    	return {
    		c() {
    			card_title = element("card-title");
    			if (title_slot) title_slot.c();
    			set_custom_element_data(card_title, "class", "svelte-1uu6vyg");
    		},
    		m(target, anchor) {
    			insert(target, card_title, anchor);

    			if (title_slot) {
    				title_slot.m(card_title, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (title_slot) {
    				if (title_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(title_slot, title_slot_template, ctx, /*$$scope*/ ctx[4], dirty, get_title_slot_changes, get_title_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(card_title);
    			if (title_slot) title_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$n(ctx) {
    	let doric_card;
    	let t;
    	let doric_card_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*$$slots*/ ctx[2].title && create_if_block$4(ctx);
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			doric_card = element("doric-card");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_card, "class", doric_card_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-1uu6vyg"));
    		},
    		m(target, anchor) {
    			insert(target, doric_card, anchor);
    			if (if_block) if_block.m(doric_card, null);
    			append(doric_card, t);

    			if (default_slot) {
    				default_slot.m(doric_card, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, doric_card, /*cardColor*/ ctx[1]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*$$slots*/ ctx[2].title) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$$slots*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(doric_card, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && doric_card_class_value !== (doric_card_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-1uu6vyg"))) {
    				set_custom_element_data(doric_card, "class", doric_card_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*cardColor*/ 2) vars_action.update.call(null, /*cardColor*/ ctx[1]);
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
    			if (detaching) detach(doric_card);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let cardColor;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { color = "default" } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(3, color = $$props.color);
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*color*/ 8) {
    			$$invalidate(1, cardColor = { "border-color": `var(--${color})` });
    		}
    	};

    	return [klass, cardColor, $$slots, color, $$scope, slots];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1uu6vyg-style")) add_css$k();
    		init(this, options, instance$m, create_fragment$n, safe_not_equal, { color: 3, class: 0 });
    	}
    }

    /* core\layout\action.svelte generated by Svelte v3.38.2 */

    function add_css$j() {
    	var style = element("style");
    	style.id = "svelte-1jtjf8f-style";
    	style.textContent = "action-layout.svelte-1jtjf8f{display:flex;align-items:space-between;justify-content:space-between;flex-direction:var(--direction)}";
    	append(document.head, style);
    }

    function create_fragment$m(ctx) {
    	let action_layout;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			action_layout = element("action-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(action_layout, "class", "svelte-1jtjf8f");
    		},
    		m(target, anchor) {
    			insert(target, action_layout, anchor);

    			if (default_slot) {
    				default_slot.m(action_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, action_layout, { direction: /*direction*/ ctx[0] }));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*direction*/ 1) vars_action.update.call(null, { direction: /*direction*/ ctx[0] });
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
    			if (detaching) detach(action_layout);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { direction = "column" } = $$props;

    	$$self.$$set = $$props => {
    		if ("direction" in $$props) $$invalidate(0, direction = $$props.direction);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [direction, $$scope, slots];
    }

    class Action extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1jtjf8f-style")) add_css$j();
    		init(this, options, instance$l, create_fragment$m, safe_not_equal, { direction: 0 });
    	}
    }

    /* core\layout\flex.svelte generated by Svelte v3.38.2 */

    function add_css$i() {
    	var style = element("style");
    	style.id = "svelte-8ozxln-style";
    	style.textContent = "flex-layout.svelte-8ozxln{display:flex;flex-wrap:wrap;flex-direction:var(--direction);padding:var(--padding);gap:var(--gap)}flex-layout.item-fill.svelte-8ozxln>*{flex-grow:1}flex-layout.svelte-8ozxln>flex-break,flex-layout.item-fill.svelte-8ozxln>flex-break{flex-basis:100%;height:0;width:0}";
    	append(document.head, style);
    }

    function create_fragment$l(ctx) {
    	let flex_layout;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	return {
    		c() {
    			flex_layout = element("flex-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(flex_layout, "class", "svelte-8ozxln");
    			toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, flex_layout, anchor);

    			if (default_slot) {
    				default_slot.m(flex_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, flex_layout, /*flexVars*/ ctx[1]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*flexVars*/ 2) vars_action.update.call(null, /*flexVars*/ ctx[1]);

    			if (dirty & /*itemFill*/ 1) {
    				toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[0]);
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

    function instance$k($$self, $$props, $$invalidate) {
    	let flexVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { direction = "row" } = $$props;
    	let { padding = "8px" } = $$props;
    	let { gap = "2px" } = $$props;
    	let { itemFill = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("direction" in $$props) $$invalidate(2, direction = $$props.direction);
    		if ("padding" in $$props) $$invalidate(3, padding = $$props.padding);
    		if ("gap" in $$props) $$invalidate(4, gap = $$props.gap);
    		if ("itemFill" in $$props) $$invalidate(0, itemFill = $$props.itemFill);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction, padding, gap*/ 28) {
    			$$invalidate(1, flexVars = { direction, padding, gap });
    		}
    	};

    	return [itemFill, flexVars, direction, padding, gap, $$scope, slots];
    }

    class Flex extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-8ozxln-style")) add_css$i();

    		init(this, options, instance$k, create_fragment$l, safe_not_equal, {
    			direction: 2,
    			padding: 3,
    			gap: 4,
    			itemFill: 0
    		});
    	}
    }

    /* core\layout\grid.svelte generated by Svelte v3.38.2 */

    function add_css$h() {
    	var style = element("style");
    	style.id = "svelte-1rv534o-style";
    	style.textContent = "grid-layout.svelte-1rv534o{display:grid;padding:var(--padding);gap:var(--gap);grid-auto-flow:var(--direction);grid-template-columns:var(--col);grid-template-rows:var(--row);grid-auto-columns:var(--autoCol);grid-auto-rows:var(--autoRow)}";
    	append(document.head, style);
    }

    function create_fragment$k(ctx) {
    	let grid_layout;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	return {
    		c() {
    			grid_layout = element("grid-layout");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(grid_layout, "class", "svelte-1rv534o");
    		},
    		m(target, anchor) {
    			insert(target, grid_layout, anchor);

    			if (default_slot) {
    				default_slot.m(grid_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, grid_layout, /*flowVars*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*flowVars*/ 1) vars_action.update.call(null, /*flowVars*/ ctx[0]);
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

    function instance$j($$self, $$props, $$invalidate) {
    	let flowVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { direction = "row" } = $$props;
    	let { padding = "8px" } = $$props;
    	let { gap = "2px" } = $$props;
    	let { cols = null } = $$props;
    	let { colWidth = "1fr" } = $$props;
    	let { rows = null } = $$props;
    	let { rowHeight = "1fr" } = $$props;

    	$$self.$$set = $$props => {
    		if ("direction" in $$props) $$invalidate(1, direction = $$props.direction);
    		if ("padding" in $$props) $$invalidate(2, padding = $$props.padding);
    		if ("gap" in $$props) $$invalidate(3, gap = $$props.gap);
    		if ("cols" in $$props) $$invalidate(4, cols = $$props.cols);
    		if ("colWidth" in $$props) $$invalidate(5, colWidth = $$props.colWidth);
    		if ("rows" in $$props) $$invalidate(6, rows = $$props.rows);
    		if ("rowHeight" in $$props) $$invalidate(7, rowHeight = $$props.rowHeight);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*direction, padding, gap, cols, colWidth, rows, rowHeight*/ 254) {
    			$$invalidate(0, flowVars = {
    				direction,
    				padding,
    				gap,
    				col: cols ? `repeat(${cols}, ${colWidth})` : null,
    				row: rows ? `repeat(${rows}, ${rowHeight})` : null,
    				autoCol: colWidth,
    				autoRow: rowHeight
    			});
    		}
    	};

    	return [
    		flowVars,
    		direction,
    		padding,
    		gap,
    		cols,
    		colWidth,
    		rows,
    		rowHeight,
    		$$scope,
    		slots
    	];
    }

    class Grid extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1rv534o-style")) add_css$h();

    		init(this, options, instance$j, create_fragment$k, safe_not_equal, {
    			direction: 1,
    			padding: 2,
    			gap: 3,
    			cols: 4,
    			colWidth: 5,
    			rows: 6,
    			rowHeight: 7
    		});
    	}
    }

    /* core\icon.svelte generated by Svelte v3.38.2 */

    function add_css$g() {
    	var style = element("style");
    	style.id = "svelte-ckwsqd-style";
    	style.textContent = "doric-icon.svelte-ckwsqd{margin:0px 4px}";
    	append(document.head, style);
    }

    function create_fragment$j(ctx) {
    	let doric_icon;
    	let t;
    	let doric_icon_class_value;
    	let vars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			doric_icon = element("doric-icon");
    			t = text(/*name*/ ctx[0]);
    			set_custom_element_data(doric_icon, "class", doric_icon_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-ckwsqd"));
    			toggle_class(doric_icon, "material-icons", !/*outlined*/ ctx[1]);
    			toggle_class(doric_icon, "material-icons-outlined", /*outlined*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, doric_icon, anchor);
    			append(doric_icon, t);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, doric_icon, /*iconVars*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data(t, /*name*/ ctx[0]);

    			if (dirty & /*klass*/ 4 && doric_icon_class_value !== (doric_icon_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-ckwsqd"))) {
    				set_custom_element_data(doric_icon, "class", doric_icon_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*iconVars*/ 8) vars_action.update.call(null, /*iconVars*/ ctx[3]);

    			if (dirty & /*klass, outlined*/ 6) {
    				toggle_class(doric_icon, "material-icons", !/*outlined*/ ctx[1]);
    			}

    			if (dirty & /*klass, outlined*/ 6) {
    				toggle_class(doric_icon, "material-icons-outlined", /*outlined*/ ctx[1]);
    			}
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

    function instance$i($$self, $$props, $$invalidate) {
    	let iconVars;
    	let { name } = $$props;
    	let { outlined = false } = $$props;
    	let { size } = $$props;
    	let { class: klass } = $$props;

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("outlined" in $$props) $$invalidate(1, outlined = $$props.outlined);
    		if ("size" in $$props) $$invalidate(4, size = $$props.size);
    		if ("class" in $$props) $$invalidate(2, klass = $$props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 16) {
    			$$invalidate(3, iconVars = { "icon-font-size": size });
    		}
    	};

    	return [name, outlined, klass, iconVars, size];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-ckwsqd-style")) add_css$g();
    		init(this, options, instance$i, create_fragment$j, safe_not_equal, { name: 0, outlined: 1, size: 4, class: 2 });
    	}
    }

    /* core\control.svelte generated by Svelte v3.38.2 */

    function add_css$f() {
    	var style = element("style");
    	style.id = "svelte-1oqekdy-style";
    	style.textContent = "control-component.svelte-1oqekdy.svelte-1oqekdy{display:inline-grid;position:relative;overflow:visible;z-index:0;grid-template-rows:min-content auto}control-content.svelte-1oqekdy.svelte-1oqekdy{position:relative;display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment control end-adornment\"\r\n        ;padding:13px 4px 4px 4px}fieldset.svelte-1oqekdy.svelte-1oqekdy{position:absolute;top:0px;left:0px;right:0px;bottom:0px;z-index:-1}.normal.svelte-1oqekdy fieldset.svelte-1oqekdy{border-radius:0px;border-width:0px;border-bottom:2px solid var(--control-border)}.outline.svelte-1oqekdy fieldset.svelte-1oqekdy{border:1px solid var(--control-border);border-radius:4px}.flat.svelte-1oqekdy fieldset.svelte-1oqekdy{border-width:0px}legend.svelte-1oqekdy.svelte-1oqekdy{font-size:12px;height:13px;color:var(--control-border)}legend.svelte-1oqekdy.svelte-1oqekdy:empty{padding:0px}fieldset.error.svelte-1oqekdy.svelte-1oqekdy{border-color:var(--control-border-error)}control-content.svelte-1oqekdy>*:focus ~ fieldset:not(.error){border-color:var(--control-border-focus)}control-content.svelte-1oqekdy>*:focus ~ fieldset > legend{color:var(--control-border-focus)}info-label.svelte-1oqekdy.svelte-1oqekdy{font-size:13px;padding-left:12px}info-label.error.svelte-1oqekdy.svelte-1oqekdy{color:var(--control-border-error)}";
    	append(document.head, style);
    }

    function create_fragment$i(ctx) {
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
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

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
    			attr(legend, "style", /*labelStyle*/ ctx[5]);
    			attr(legend, "class", "svelte-1oqekdy");
    			attr(fieldset, "style", /*borderStyle*/ ctx[6]);
    			attr(fieldset, "class", "svelte-1oqekdy");
    			toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			set_custom_element_data(control_content, "class", "svelte-1oqekdy");
    			set_custom_element_data(info_label0, "class", "svelte-1oqekdy");
    			set_custom_element_data(info_label1, "class", "error svelte-1oqekdy");
    			set_custom_element_data(control_component, "style", /*style*/ ctx[4]);
    			set_custom_element_data(control_component, "class", control_component_class_value = "" + (/*variant*/ ctx[3] + " " + /*klass*/ ctx[7] + " svelte-1oqekdy"));
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*label*/ 2) set_data(t1, /*label*/ ctx[1]);

    			if (!current || dirty & /*labelStyle*/ 32) {
    				attr(legend, "style", /*labelStyle*/ ctx[5]);
    			}

    			if (!current || dirty & /*borderStyle*/ 64) {
    				attr(fieldset, "style", /*borderStyle*/ ctx[6]);
    			}

    			if (dirty & /*error*/ 1) {
    				toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			}

    			if (!current || dirty & /*info*/ 4) set_data(t3, /*info*/ ctx[2]);
    			if (!current || dirty & /*error*/ 1) set_data(t5, /*error*/ ctx[0]);

    			if (!current || dirty & /*style*/ 16) {
    				set_custom_element_data(control_component, "style", /*style*/ ctx[4]);
    			}

    			if (!current || dirty & /*variant, klass*/ 136 && control_component_class_value !== (control_component_class_value = "" + (/*variant*/ ctx[3] + " " + /*klass*/ ctx[7] + " svelte-1oqekdy"))) {
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

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { error = "" } = $$props;
    	let { label = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant = "normal" } = $$props;
    	let { style = "" } = $$props;
    	let { labelStyle = "" } = $$props;
    	let { borderStyle = "" } = $$props;
    	let { klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("info" in $$props) $$invalidate(2, info = $$props.info);
    		if ("variant" in $$props) $$invalidate(3, variant = $$props.variant);
    		if ("style" in $$props) $$invalidate(4, style = $$props.style);
    		if ("labelStyle" in $$props) $$invalidate(5, labelStyle = $$props.labelStyle);
    		if ("borderStyle" in $$props) $$invalidate(6, borderStyle = $$props.borderStyle);
    		if ("klass" in $$props) $$invalidate(7, klass = $$props.klass);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	return [
    		error,
    		label,
    		info,
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
    		if (!document.getElementById("svelte-1oqekdy-style")) add_css$f();

    		init(this, options, instance$h, create_fragment$i, safe_not_equal, {
    			error: 0,
    			label: 1,
    			info: 2,
    			variant: 3,
    			style: 4,
    			labelStyle: 5,
    			borderStyle: 6,
    			klass: 7
    		});
    	}
    }

    /* core\list.svelte generated by Svelte v3.38.2 */

    function add_css$e() {
    	var style = element("style");
    	style.id = "svelte-t1d0kc-style";
    	style.textContent = "doric-list.svelte-t1d0kc{display:flex;overflow:auto;height:var(--list-height);user-select:none;flex-direction:column}doric-list.svelte-t1d0kc>list-item, list-header{display:grid;position:relative;overflow:hidden;padding:12px 16px;color:var(--text-normal);grid-template-areas:\"start-adornment content end-adornment\"\r\n        ;grid-template-columns:auto 1fr auto}doric-list.svelte-t1d0kc>list-header > list-header-content{font-size:var(--text-size-header);font-weight:700}doric-list.svelte-t1d0kc>list-item > a{position:absolute;top:0px;left:0px;bottom:0px;right:0px;opacity:0}doric-list.svelte-t1d0kc>list-item[dividers]:not(:last-child){border-top:1px solid var(--text-secondary);border-bottom:1px solid var(--text-secondary);margin-top:-1px}doric-list.svelte-t1d0kc>list-item > list-item-content, list-header > list-header-content{grid-area:content;display:flex;flex-direction:column;justify-content:center;align-items:stretch;grid-area:content}doric-list.svelte-t1d0kc>list-item[control]{padding:0px}";
    	append(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    const get_default_slot_changes$1 = dirty => ({ item: dirty & /*items*/ 1 });
    const get_default_slot_context$1 = ctx => ({ item: /*item*/ ctx[6] });
    const get_header_slot_changes = dirty => ({ item: dirty & /*items*/ 1 });
    const get_header_slot_context = ctx => ({ item: /*item*/ ctx[6] });

    // (72:8) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], get_default_slot_context$1);
    	const default_slot_or_fallback = default_slot || fallback_block_1$1(ctx);

    	return {
    		c() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, items*/ 17)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, get_default_slot_changes$1, get_default_slot_context$1);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*items*/ 1) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (64:8) {#if item.header !== undefined}
    function create_if_block$3(ctx) {
    	let current;
    	const header_slot_template = /*#slots*/ ctx[5].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[4], get_header_slot_context);
    	const header_slot_or_fallback = header_slot || fallback_block$1(ctx);

    	return {
    		c() {
    			if (header_slot_or_fallback) header_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (header_slot_or_fallback) {
    				header_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (header_slot) {
    				if (header_slot.p && (!current || dirty & /*$$scope, items*/ 17)) {
    					update_slot(header_slot, header_slot_template, ctx, /*$$scope*/ ctx[4], dirty, get_header_slot_changes, get_header_slot_context);
    				}
    			} else {
    				if (header_slot_or_fallback && header_slot_or_fallback.p && dirty & /*items*/ 1) {
    					header_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(header_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(header_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (header_slot_or_fallback) header_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (73:25)                   
    function fallback_block_1$1(ctx) {
    	let list_item;
    	let list_item_content;
    	let t0_value = (/*item*/ ctx[6] ?? "") + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			list_item = element("list-item");
    			list_item_content = element("list-item-content");
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);
    			append(list_item, list_item_content);
    			append(list_item_content, t0);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = (/*item*/ ctx[6] ?? "") + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (65:39)                   
    function fallback_block$1(ctx) {
    	let list_header;
    	let list_header_content;
    	let t0_value = /*item*/ ctx[6].header + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			list_header = element("list-header");
    			list_header_content = element("list-header-content");
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m(target, anchor) {
    			insert(target, list_header, anchor);
    			append(list_header, list_header_content);
    			append(list_header_content, t0);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = /*item*/ ctx[6].header + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(list_header);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (63:4) {#each items as item}
    function create_each_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[6].header !== undefined) return 0;
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

    function create_fragment$h(ctx) {
    	let doric_list;
    	let doric_list_class_value;
    	let current;
    	let each_value = /*items*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			doric_list = element("doric-list");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(doric_list, "class", doric_list_class_value = "" + (null_to_empty(/*klass*/ ctx[3]) + " svelte-t1d0kc"));
    			set_style(doric_list, "--list-height", /*height*/ ctx[1]);
    			toggle_class(doric_list, "compact", /*compact*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, doric_list, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(doric_list, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*items, $$scope, undefined*/ 17) {
    				each_value = /*items*/ ctx[0];
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
    						each_blocks[i].m(doric_list, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*klass*/ 8 && doric_list_class_value !== (doric_list_class_value = "" + (null_to_empty(/*klass*/ ctx[3]) + " svelte-t1d0kc"))) {
    				set_custom_element_data(doric_list, "class", doric_list_class_value);
    			}

    			if (!current || dirty & /*height*/ 2) {
    				set_style(doric_list, "--list-height", /*height*/ ctx[1]);
    			}

    			if (dirty & /*klass, compact*/ 12) {
    				toggle_class(doric_list, "compact", /*compact*/ ctx[2]);
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
    			if (detaching) detach(doric_list);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { items = [] } = $$props;
    	let { height } = $$props;
    	let { compact } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("compact" in $$props) $$invalidate(2, compact = $$props.compact);
    		if ("class" in $$props) $$invalidate(3, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [items, height, compact, klass, $$scope, slots];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-t1d0kc-style")) add_css$e();

    		init(this, options, instance$g, create_fragment$h, safe_not_equal, {
    			items: 0,
    			height: 1,
    			compact: 2,
    			class: 3
    		});
    	}
    }

    /* core\portal.svelte generated by Svelte v3.38.2 */

    function create_fragment$g(ctx) {
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
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

    let portalRoot = null;

    if (typeof document !== "undefined") {
    	portalRoot = document.createElement("portal-root");
    	document.body.appendChild(portalRoot);
    }

    function instance_1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let instance;

    	onMount(() => {
    		portalRoot?.appendChild(instance);
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
    		init(this, options, instance_1, create_fragment$g, safe_not_equal, {});
    	}
    }

    /* core\modal.svelte generated by Svelte v3.38.2 */

    function add_css$d() {
    	var style = element("style");
    	style.id = "svelte-1k9jxow-style";
    	style.textContent = "modal-wrapper.svelte-1k9jxow{position:fixed;top:0px;left:0px;width:100vw;height:100vh;background-color:rgba(0, 0, 0, 0.35);z-index:100}modal-wrapper.clear.svelte-1k9jxow{background-color:transparent}";
    	append(document.head, style);
    }

    // (36:4) {#if open}
    function create_if_block$2(ctx) {
    	let modal_wrapper;
    	let div;
    	let modal_wrapper_transition;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			modal_wrapper = element("modal-wrapper");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(modal_wrapper, "class", "svelte-1k9jxow");
    			toggle_class(modal_wrapper, "clear", /*clear*/ ctx[1]);
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
    					listen(div, "tap", stop_propagation(/*tap_handler*/ ctx[5])),
    					listen(modal_wrapper, "tap", /*close*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
    				}
    			}

    			if (dirty & /*clear*/ 2) {
    				toggle_class(modal_wrapper, "clear", /*clear*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, /*anim*/ ctx[2], true);
    				modal_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, /*anim*/ ctx[2], false);
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

    // (35:0) <Portal>
    function create_default_slot$9(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*open*/ ctx[0] && create_if_block$2(ctx);

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
    					if_block = create_if_block$2(ctx);
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

    function create_fragment$f(ctx) {
    	let portal;
    	let current;

    	portal = new Portal({
    			props: {
    				$$slots: { default: [create_default_slot$9] },
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

    			if (dirty & /*$$scope, clear, open*/ 67) {
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

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { open = false } = $$props;
    	let { clear } = $$props;
    	const dispatch = createEventDispatcher();
    	const anim = { duration: 250 };

    	const close = evt => {
    		dispatch("close");
    	};

    	function tap_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("clear" in $$props) $$invalidate(1, clear = $$props.clear);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	return [open, clear, anim, close, slots, tap_handler, $$scope];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1k9jxow-style")) add_css$d();
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { open: 0, clear: 1 });
    	}
    }

    /* core\popover.svelte generated by Svelte v3.38.2 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-lz0305-style";
    	style.textContent = "popover-wrapper.svelte-lz0305{position:relative;display:inline-grid}doric-popover.svelte-lz0305{position:absolute;left:var(--left);right:var(--right);top:var(--top);bottom:var(--bottom);overflow:visible;z-index:150}popover-content.svelte-lz0305{display:inline-block;position:relative;top:var(--y);left:var(--x);transform:translate(\r\n            var(--tx, 0%),\r\n            var(--ty, 0%)\r\n        );min-width:var(--width);min-height:var(--height)}";
    	append(document.head, style);
    }

    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});

    // (63:4) {#if visible}
    function create_if_block$1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: true,
    				clear: true,
    				$$slots: { default: [create_default_slot$8] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*cancel*/ ctx[3]);

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

    			if (dirty & /*$$scope, displayVars*/ 516) {
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

    // (64:8) <Modal open clear on:close={cancel}>
    function create_default_slot$8(ctx) {
    	let doric_popover;
    	let popover_content;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const content_slot_template = /*#slots*/ ctx[7].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[9], get_content_slot_context);

    	return {
    		c() {
    			doric_popover = element("doric-popover");
    			popover_content = element("popover-content");
    			if (content_slot) content_slot.c();
    			set_custom_element_data(popover_content, "class", "svelte-lz0305");
    			set_custom_element_data(doric_popover, "class", "svelte-lz0305");
    		},
    		m(target, anchor) {
    			insert(target, doric_popover, anchor);
    			append(doric_popover, popover_content);

    			if (content_slot) {
    				content_slot.m(popover_content, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, doric_popover, /*displayVars*/ ctx[2]));
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (content_slot) {
    				if (content_slot.p && (!current || dirty & /*$$scope*/ 512)) {
    					update_slot(content_slot, content_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_content_slot_changes, get_content_slot_context);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*displayVars*/ 4) vars_action.update.call(null, /*displayVars*/ ctx[2]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(content_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(content_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_popover);
    			if (content_slot) content_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let popover_wrapper;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);
    	let if_block = /*visible*/ ctx[0] && create_if_block$1(ctx);

    	return {
    		c() {
    			popover_wrapper = element("popover-wrapper");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			set_custom_element_data(popover_wrapper, "class", "svelte-lz0305");
    		},
    		m(target, anchor) {
    			insert(target, popover_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(popover_wrapper, null);
    			}

    			append(popover_wrapper, t);
    			if (if_block) if_block.m(popover_wrapper, null);
    			/*popover_wrapper_binding*/ ctx[8](popover_wrapper);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}

    			if (/*visible*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(popover_wrapper, null);
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
    			if (detaching) detach(popover_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    			/*popover_wrapper_binding*/ ctx[8](null);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let position;
    	let displayVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { origin = {} } = $$props;
    	let { size = {} } = $$props;
    	let { visible = false } = $$props;

    	const recalc = (wrapper, visible) => {
    		if (visible === false) {
    			return {};
    		}

    		const { left, top, width, height } = wrapper.getBoundingClientRect();

    		return {
    			left: [left, "px"],
    			top: [top, "px"],
    			width: [width, "px"],
    			height: [height, "px"]
    		};
    	};

    	const dispatch = createEventDispatcher();
    	const cancel = () => dispatch("cancel");
    	let wrapper = null;

    	function popover_wrapper_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrapper = $$value;
    			$$invalidate(1, wrapper);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("origin" in $$props) $$invalidate(4, origin = $$props.origin);
    		if ("size" in $$props) $$invalidate(5, size = $$props.size);
    		if ("visible" in $$props) $$invalidate(0, visible = $$props.visible);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*wrapper, visible*/ 3) {
    			$$invalidate(6, position = recalc(wrapper, visible));
    		}

    		if ($$self.$$.dirty & /*origin, size, position*/ 112) {
    			$$invalidate(2, displayVars = { ...origin, ...size, ...position });
    		}
    	};

    	return [
    		visible,
    		wrapper,
    		displayVars,
    		cancel,
    		origin,
    		size,
    		position,
    		slots,
    		popover_wrapper_binding,
    		$$scope
    	];
    }

    class Popover extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-lz0305-style")) add_css$c();
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { origin: 4, size: 5, visible: 0 });
    	}
    }

    /* core\select.svelte generated by Svelte v3.38.2 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-7gkalf-style";
    	style.textContent = "arrow-icon.svelte-7gkalf{grid-area:end-adornment;display:flex;align-items:center}tap-area.svelte-7gkalf{position:absolute;top:0px;left:0px;right:0px;bottom:0px;cursor:pointer}options-display.svelte-7gkalf{display:inline-block;min-width:100%;overflow-y:auto;overflow:visible}item-area.svelte-7gkalf{max-height:40vh;overflow:auto}selected-item-display.svelte-7gkalf{display:inline-block;padding:8px;grid-area:control;user-select:none}selected-item-display.svelte-7gkalf:focus{outline:none}list-item.svelte-7gkalf{cursor:pointer}list-item-content.svelte-7gkalf>select-label{min-width:100%}";
    	append(document.head, style);
    }

    const get_selected_slot_changes = dirty => ({
    	selectedItem: dirty & /*selectedItem*/ 256
    });

    const get_selected_slot_context = ctx => ({
    	selectedItem: /*selectedItem*/ ctx[8],
    	item: /*item*/ ctx[24]
    });

    const get_default_slot_changes = dirty => ({ item: dirty & /*item*/ 16777216 });
    const get_default_slot_context = ctx => ({ item: /*item*/ ctx[24] });

    // (105:49)                   
    function fallback_block_1(ctx) {
    	let t_value = /*selectedItem*/ ctx[8].label + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selectedItem*/ 256 && t_value !== (t_value = /*selectedItem*/ ctx[8].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (103:4) <Control {...controlProps}>
    function create_default_slot_3$3(ctx) {
    	let selected_item_display;
    	let t;
    	let arrow_icon;
    	let icon;
    	let current;
    	let mounted;
    	let dispose;
    	const selected_slot_template = /*#slots*/ ctx[20].selected;
    	const selected_slot = create_slot(selected_slot_template, ctx, /*$$scope*/ ctx[23], get_selected_slot_context);
    	const selected_slot_or_fallback = selected_slot || fallback_block_1(ctx);

    	icon = new Icon({
    			props: { name: "arrow_drop_down", size: "28px" }
    		});

    	return {
    		c() {
    			selected_item_display = element("selected-item-display");
    			if (selected_slot_or_fallback) selected_slot_or_fallback.c();
    			t = space();
    			arrow_icon = element("arrow-icon");
    			create_component(icon.$$.fragment);
    			set_custom_element_data(selected_item_display, "tabindex", "0");
    			set_custom_element_data(selected_item_display, "class", "svelte-7gkalf");
    			set_custom_element_data(arrow_icon, "class", "svelte-7gkalf");
    		},
    		m(target, anchor) {
    			insert(target, selected_item_display, anchor);

    			if (selected_slot_or_fallback) {
    				selected_slot_or_fallback.m(selected_item_display, null);
    			}

    			/*selected_item_display_binding*/ ctx[22](selected_item_display);
    			insert(target, t, anchor);
    			insert(target, arrow_icon, anchor);
    			mount_component(icon, arrow_icon, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(selected_item_display, "blur", /*keep*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (selected_slot) {
    				if (selected_slot.p && (!current || dirty & /*$$scope, selectedItem*/ 8388864)) {
    					update_slot(selected_slot, selected_slot_template, ctx, /*$$scope*/ ctx[23], dirty, get_selected_slot_changes, get_selected_slot_context);
    				}
    			} else {
    				if (selected_slot_or_fallback && selected_slot_or_fallback.p && dirty & /*selectedItem*/ 256) {
    					selected_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(selected_slot_or_fallback, local);
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(selected_slot_or_fallback, local);
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(selected_item_display);
    			if (selected_slot_or_fallback) selected_slot_or_fallback.d(detaching);
    			/*selected_item_display_binding*/ ctx[22](null);
    			if (detaching) detach(t);
    			if (detaching) detach(arrow_icon);
    			destroy_component(icon);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (102:0) <Popover {visible} {origin} {size} modal on:cancel={closeOptions}>
    function create_default_slot_2$3(ctx) {
    	let control;
    	let t;
    	let tap_area;
    	let ripple;
    	let current;
    	let mounted;
    	let dispose;
    	const control_spread_levels = [/*controlProps*/ ctx[7]];

    	let control_props = {
    		$$slots: { default: [create_default_slot_3$3] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < control_spread_levels.length; i += 1) {
    		control_props = assign(control_props, control_spread_levels[i]);
    	}

    	control = new Control({ props: control_props });
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[2] } });

    	return {
    		c() {
    			create_component(control.$$.fragment);
    			t = space();
    			tap_area = element("tap-area");
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(tap_area, "tabindex", "-1");
    			set_custom_element_data(tap_area, "class", "svelte-7gkalf");
    		},
    		m(target, anchor) {
    			mount_component(control, target, anchor);
    			insert(target, t, anchor);
    			insert(target, tap_area, anchor);
    			mount_component(ripple, tap_area, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(tap_area, "tap", /*openOptions*/ ctx[10]),
    					listen(tap_area, "focus", /*focus*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const control_changes = (dirty & /*controlProps*/ 128)
    			? get_spread_update(control_spread_levels, [get_spread_object(/*controlProps*/ ctx[7])])
    			: {};

    			if (dirty & /*$$scope, display, selectedItem*/ 8388896) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 4) ripple_changes.disabled = /*disabled*/ ctx[2];
    			ripple.$set(ripple_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(control.$$.fragment, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(control, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(tap_area);
    			destroy_component(ripple);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (125:41)                                   
    function fallback_block(ctx) {
    	let select_label;
    	let t_value = /*item*/ ctx[24].label + "";
    	let t;

    	return {
    		c() {
    			select_label = element("select-label");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, select_label, anchor);
    			append(select_label, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*item*/ 16777216 && t_value !== (t_value = /*item*/ ctx[24].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(select_label);
    		}
    	};
    }

    // (122:16) <List let:item items={options}>
    function create_default_slot_1$3(ctx) {
    	let list_item;
    	let list_item_content;
    	let t;
    	let ripple;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[20].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[23], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);
    	ripple = new Ripple({});

    	function tap_handler() {
    		return /*tap_handler*/ ctx[21](/*item*/ ctx[24]);
    	}

    	return {
    		c() {
    			list_item = element("list-item");
    			list_item_content = element("list-item-content");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(list_item_content, "class", "svelte-7gkalf");
    			set_custom_element_data(list_item, "dividers", "");
    			set_custom_element_data(list_item, "class", "svelte-7gkalf");
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);
    			append(list_item, list_item_content);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(list_item_content, null);
    			}

    			append(list_item, t);
    			mount_component(ripple, list_item, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(list_item, "tap", tap_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, item*/ 25165824)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[23], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*item*/ 16777216) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (117:8) <Card>
    function create_default_slot$7(ctx) {
    	let item_area;
    	let list;
    	let current;

    	list = new List({
    			props: {
    				items: /*options*/ ctx[3],
    				$$slots: {
    					default: [
    						create_default_slot_1$3,
    						({ item }) => ({ 24: item }),
    						({ item }) => item ? 16777216 : 0
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			item_area = element("item-area");
    			create_component(list.$$.fragment);
    			set_custom_element_data(item_area, "class", "svelte-7gkalf");
    		},
    		m(target, anchor) {
    			insert(target, item_area, anchor);
    			mount_component(list, item_area, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};
    			if (dirty & /*options*/ 8) list_changes.items = /*options*/ ctx[3];

    			if (dirty & /*$$scope, item*/ 25165824) {
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
    			if (detaching) detach(item_area);
    			destroy_component(list);
    		}
    	};
    }

    // (118:12) <svelte:fragment slot="title">
    function create_title_slot$3(ctx) {
    	let t_value = (/*label*/ ctx[0] ?? /*optionLabel*/ ctx[1]) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label, optionLabel*/ 3 && t_value !== (t_value = (/*label*/ ctx[0] ?? /*optionLabel*/ ctx[1]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (116:4) 
    function create_content_slot(ctx) {
    	let options_display;
    	let card;
    	let options_display_transition;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: {
    					title: [create_title_slot$3],
    					default: [create_default_slot$7]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			options_display = element("options-display");
    			create_component(card.$$.fragment);
    			set_custom_element_data(options_display, "slot", "content");
    			set_custom_element_data(options_display, "class", "svelte-7gkalf");
    		},
    		m(target, anchor) {
    			insert(target, options_display, anchor);
    			mount_component(card, options_display, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const card_changes = {};

    			if (dirty & /*$$scope, label, optionLabel, options*/ 8388619) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);

    			add_render_callback(() => {
    				if (!options_display_transition) options_display_transition = create_bidirectional_transition(options_display, fade, { duration: 250 }, true);
    				options_display_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			if (!options_display_transition) options_display_transition = create_bidirectional_transition(options_display, fade, { duration: 250 }, false);
    			options_display_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(options_display);
    			destroy_component(card);
    			if (detaching && options_display_transition) options_display_transition.end();
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let popover;
    	let current;

    	popover = new Popover({
    			props: {
    				visible: /*visible*/ ctx[6],
    				origin: /*origin*/ ctx[4],
    				size: /*size*/ ctx[13],
    				modal: true,
    				$$slots: {
    					content: [create_content_slot],
    					default: [create_default_slot_2$3]
    				},
    				$$scope: { ctx }
    			}
    		});

    	popover.$on("cancel", /*closeOptions*/ ctx[11]);

    	return {
    		c() {
    			create_component(popover.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(popover, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const popover_changes = {};
    			if (dirty & /*visible*/ 64) popover_changes.visible = /*visible*/ ctx[6];
    			if (dirty & /*origin*/ 16) popover_changes.origin = /*origin*/ ctx[4];

    			if (dirty & /*$$scope, label, optionLabel, options, disabled, controlProps, display, selectedItem*/ 8389039) {
    				popover_changes.$$scope = { dirty, ctx };
    			}

    			popover.$set(popover_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(popover.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(popover.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(popover, detaching);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let controlProps;
    	let selectedItem;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label } = $$props;
    	let { optionLabel } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { options = [] } = $$props;
    	let { origin = {} } = $$props;
    	let display = null;

    	const focus = () => {
    		display.focus();
    	};

    	let visible = false;
    	const openOptions = () => $$invalidate(6, visible = true);
    	const closeOptions = () => $$invalidate(6, visible = false);

    	const keep = evt => {
    		if (visible === true) {
    			evt.preventDefault();
    			evt.target.focus();
    		}
    	};

    	const size = { width: "100%" };

    	const update = item => {
    		$$invalidate(15, value = item.value);
    		closeOptions();
    	};

    	const tap_handler = item => update(item);

    	function selected_item_display_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			display = $$value;
    			$$invalidate(5, display);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("optionLabel" in $$props) $$invalidate(1, optionLabel = $$props.optionLabel);
    		if ("error" in $$props) $$invalidate(16, error = $$props.error);
    		if ("info" in $$props) $$invalidate(17, info = $$props.info);
    		if ("variant" in $$props) $$invalidate(18, variant = $$props.variant);
    		if ("class" in $$props) $$invalidate(19, klass = $$props.class);
    		if ("value" in $$props) $$invalidate(15, value = $$props.value);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    		if ("options" in $$props) $$invalidate(3, options = $$props.options);
    		if ("origin" in $$props) $$invalidate(4, origin = $$props.origin);
    		if ("$$scope" in $$props) $$invalidate(23, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, variant, klass*/ 983041) {
    			$$invalidate(7, controlProps = { label, info, error, variant, klass });
    		}

    		if ($$self.$$.dirty & /*options, value*/ 32776) {
    			$$invalidate(8, selectedItem = options.find(item => item.value === value) ?? { label: "" });
    		}
    	};

    	return [
    		label,
    		optionLabel,
    		disabled,
    		options,
    		origin,
    		display,
    		visible,
    		controlProps,
    		selectedItem,
    		focus,
    		openOptions,
    		closeOptions,
    		keep,
    		size,
    		update,
    		value,
    		error,
    		info,
    		variant,
    		klass,
    		slots,
    		tap_handler,
    		selected_item_display_binding,
    		$$scope
    	];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-7gkalf-style")) add_css$b();

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			label: 0,
    			optionLabel: 1,
    			error: 16,
    			info: 17,
    			variant: 18,
    			class: 19,
    			value: 15,
    			disabled: 2,
    			options: 3,
    			origin: 4
    		});
    	}
    }

    /* core\title-bar.svelte generated by Svelte v3.38.2 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-m9ifc6-style";
    	style.textContent = "doric-title-bar.svelte-m9ifc6.svelte-m9ifc6{position:relative;z-index:+0;grid-template-rows:56px min-content;background-color:var(--title-bar-background);color:var(--title-bar-text);display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"menu-adornment title action-adornment\"\r\n            \"extension-adornment extension-adornment extension-adornment\"\r\n        ;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25)}doric-title-bar.svelte-m9ifc6 doric-adornment > *:not([ignore-titlebar-reskin]){--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark);--control-border:var(--title-bar-text);--control-border-focus:var(--title-bar-text)}doric-title-bar.sticky.svelte-m9ifc6.svelte-m9ifc6{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.svelte-m9ifc6>title-text.svelte-m9ifc6{grid-area:title;font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}doric-title-bar.center.svelte-m9ifc6>title-text.svelte-m9ifc6{justify-content:center}";
    	append(document.head, style);
    }

    const get_adornments_slot_changes = dirty => ({});
    const get_adornments_slot_context = ctx => ({});

    function create_fragment$c(ctx) {
    	let doric_title_bar;
    	let title_text;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);
    	const adornments_slot_template = /*#slots*/ ctx[3].adornments;
    	const adornments_slot = create_slot(adornments_slot_template, ctx, /*$$scope*/ ctx[2], get_adornments_slot_context);

    	return {
    		c() {
    			doric_title_bar = element("doric-title-bar");
    			title_text = element("title-text");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (adornments_slot) adornments_slot.c();
    			set_custom_element_data(title_text, "class", "svelte-m9ifc6");
    			set_custom_element_data(doric_title_bar, "class", "svelte-m9ifc6");
    			toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			toggle_class(doric_title_bar, "center", /*center*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, doric_title_bar, anchor);
    			append(doric_title_bar, title_text);

    			if (default_slot) {
    				default_slot.m(title_text, null);
    			}

    			append(doric_title_bar, t);

    			if (adornments_slot) {
    				adornments_slot.m(doric_title_bar, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (adornments_slot) {
    				if (adornments_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(adornments_slot, adornments_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_adornments_slot_changes, get_adornments_slot_context);
    				}
    			}

    			if (dirty & /*sticky*/ 1) {
    				toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			}

    			if (dirty & /*center*/ 2) {
    				toggle_class(doric_title_bar, "center", /*center*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(adornments_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(adornments_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_title_bar);
    			if (default_slot) default_slot.d(detaching);
    			if (adornments_slot) adornments_slot.d(detaching);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { center } = $$props;

    	$$self.$$set = $$props => {
    		if ("sticky" in $$props) $$invalidate(0, sticky = $$props.sticky);
    		if ("center" in $$props) $$invalidate(1, center = $$props.center);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [sticky, center, $$scope, slots];
    }

    class Title_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-m9ifc6-style")) add_css$a();
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { sticky: 0, center: 1 });
    	}
    }

    /* core\text-input.svelte generated by Svelte v3.38.2 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-1tyb9cz-style";
    	style.textContent = "input.svelte-1tyb9cz{font-family:var(--font);font-size:var(--text-size);grid-area:control;height:36px;box-sizing:border-box;padding:8px 4px;border-width:0px;background-color:transparent;color:var(--text-normal);min-width:24px}input.svelte-1tyb9cz:focus{outline:none}";
    	append(document.head, style);
    }

    // (53:0) <Control type="text-input" {...controlProps}>
    function create_default_slot$6(ctx) {
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

    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[17], null);

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			if (default_slot) default_slot.c();
    			set_attributes(input, input_data);
    			toggle_class(input, "svelte-1tyb9cz", true);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			/*input_binding*/ ctx[15](input);
    			set_input_value(input, /*value*/ ctx[0]);
    			insert(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[16]),
    					listen(input, "focus", /*focus_handler*/ ctx[13]),
    					listen(input, "blur", /*blur_handler*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*inputProps*/ 8 && /*inputProps*/ ctx[3]]));

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			toggle_class(input, "svelte-1tyb9cz", true);

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 131072)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[17], dirty, null, null);
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
    			/*input_binding*/ ctx[15](null);
    			if (detaching) detach(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let control;
    	let current;
    	const control_spread_levels = [{ type: "text-input" }, /*controlProps*/ ctx[2]];

    	let control_props = {
    		$$slots: { default: [create_default_slot$6] },
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

    			if (dirty & /*$$scope, inputProps, inputElement, value*/ 131083) {
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

    function instance$b($$self, $$props, $$invalidate) {
    	let controlProps;
    	let inputProps;
    	const omit_props_names = ["label","error","info","variant","class","value","disabled","type","focus"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = "" } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { type = "text" } = $$props;
    	let inputElement = null;

    	function focus() {
    		inputElement.focus();
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
    		$$invalidate(18, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("label" in $$new_props) $$invalidate(4, label = $$new_props.label);
    		if ("error" in $$new_props) $$invalidate(5, error = $$new_props.error);
    		if ("info" in $$new_props) $$invalidate(6, info = $$new_props.info);
    		if ("variant" in $$new_props) $$invalidate(7, variant = $$new_props.variant);
    		if ("class" in $$new_props) $$invalidate(8, klass = $$new_props.class);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("disabled" in $$new_props) $$invalidate(9, disabled = $$new_props.disabled);
    		if ("type" in $$new_props) $$invalidate(10, type = $$new_props.type);
    		if ("$$scope" in $$new_props) $$invalidate(17, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, variant, disabled, klass*/ 1008) {
    			$$invalidate(2, controlProps = {
    				label,
    				info,
    				error,
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
    		klass,
    		disabled,
    		type,
    		focus,
    		slots,
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
    		if (!document.getElementById("svelte-1tyb9cz-style")) add_css$9();

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			label: 4,
    			error: 5,
    			info: 6,
    			variant: 7,
    			class: 8,
    			value: 0,
    			disabled: 9,
    			type: 10,
    			focus: 11
    		});
    	}

    	get focus() {
    		return this.$$.ctx[11];
    	}
    }

    /* core\circle-spinner.svelte generated by Svelte v3.38.2 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-1giunr6-style";
    	style.textContent = "@keyframes svelte-1giunr6-rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}circle.svelte-1giunr6{stroke:var(--primary);animation-name:svelte-1giunr6-rotate;animation-iteration-count:infinite;animation-delay:0s;animation-timing-function:linear;transform-origin:50% 50%}.outer.svelte-1giunr6{animation-duration:4s}.middle.svelte-1giunr6{stroke:var(--primary-light);animation-duration:3s;animation-direction:reverse}.inner.svelte-1giunr6{animation-duration:2s}";
    	append(document.head, style);
    }

    function create_fragment$a(ctx) {
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

    function instance$a($$self, $$props, $$invalidate) {
    	let { size = 100 } = $$props;

    	const dash = (radius, count) => {
    		const circ = Math.PI * 2 * radius;
    		const parts = count * 2;
    		const partSize = circ / parts;
    		return [0, partSize / 2, ...Array.from({ length: parts }, () => partSize)].join(" ");
    	};

    	$$self.$$set = $$props => {
    		if ("size" in $$props) $$invalidate(0, size = $$props.size);
    	};

    	return [size, dash];
    }

    class Circle_spinner extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1giunr6-style")) add_css$8();
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { size: 0 });
    	}
    }

    /* core\hexagon-spinner.svelte generated by Svelte v3.38.2 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-hqd016-style";
    	style.textContent = "@keyframes svelte-hqd016-rotate{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}path.svelte-hqd016{stroke:var(--primary);animation-name:svelte-hqd016-rotate;animation-iteration-count:infinite;animation-delay:0s;animation-timing-function:linear;transform-origin:50% 50%}.outer.svelte-hqd016{animation-duration:3s}.middle.svelte-hqd016{stroke:var(--primary-light);animation-duration:2s;animation-direction:reverse}.inner.svelte-hqd016{animation-duration:1s}";
    	append(document.head, style);
    }

    function create_fragment$9(ctx) {
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

    function instance$9($$self, $$props, $$invalidate) {
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
    		if ("size" in $$props) $$invalidate(0, size = $$props.size);
    	};

    	return [size, hexPath];
    }

    class Hexagon_spinner extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-hqd016-style")) add_css$7();
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { size: 0 });
    	}
    }

    /* core\dialog.svelte generated by Svelte v3.38.2 */

    function create_default_slot$5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[1];

    	function switch_props(ctx) {
    		return {
    			props: {
    				options: /*options*/ ctx[3],
    				close: /*close*/ ctx[4]
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*options*/ 8) switch_instance_changes.options = /*options*/ ctx[3];

    			if (switch_value !== (switch_value = /*component*/ ctx[1])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
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

    function create_fragment$8(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: /*open*/ ctx[2],
    				persistent: /*persistent*/ ctx[0],
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*closeOuter*/ ctx[5]);

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
    			if (dirty & /*open*/ 4) modal_changes.open = /*open*/ ctx[2];
    			if (dirty & /*persistent*/ 1) modal_changes.persistent = /*persistent*/ ctx[0];

    			if (dirty & /*$$scope, component, options*/ 266) {
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

    function instance$8($$self, $$props, $$invalidate) {
    	let { persistent } = $$props;
    	let { component } = $$props;
    	let open = false;
    	let options = {};
    	let resolver;

    	const show = opts => new Promise(resolve => {
    			resolver = resolve;
    			$$invalidate(3, options = opts);
    			$$invalidate(2, open = true);
    		});

    	const close = value => {
    		$$invalidate(2, open = false);
    		resolver(value);
    	};

    	const closeOuter = () => {
    		if (persistent === true) {
    			return;
    		}

    		close(undefined);
    	};

    	$$self.$$set = $$props => {
    		if ("persistent" in $$props) $$invalidate(0, persistent = $$props.persistent);
    		if ("component" in $$props) $$invalidate(1, component = $$props.component);
    	};

    	return [persistent, component, open, options, close, closeOuter, show];
    }

    class Dialog extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { persistent: 0, component: 1, show: 6 });
    	}

    	get show() {
    		return this.$$.ctx[6];
    	}
    }

    /* core\dialog\content.svelte generated by Svelte v3.38.2 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-1aoosmb-style";
    	style.textContent = "dialog-content.svelte-1aoosmb{display:block;position:absolute;top:var(--top);left:var(--left);transform:translate(\r\n            calc(var(--originX) * -1),\r\n            calc(var(--originY) * -1)\r\n        );width:var(--width);height:var(--height)}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
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
    			set_custom_element_data(dialog_content, "class", "svelte-1aoosmb");
    		},
    		m(target, anchor) {
    			insert(target, dialog_content, anchor);

    			if (default_slot) {
    				default_slot.m(dialog_content, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, dialog_content, /*position*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
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

    function instance$7($$self, $$props, $$invalidate) {
    	let position;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { top = "0%" } = $$props;
    	let { left = "0%" } = $$props;
    	let { originX = "0%" } = $$props;
    	let { originY = "0%" } = $$props;
    	let { width = "" } = $$props;
    	let { height = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("top" in $$props) $$invalidate(1, top = $$props.top);
    		if ("left" in $$props) $$invalidate(2, left = $$props.left);
    		if ("originX" in $$props) $$invalidate(3, originX = $$props.originX);
    		if ("originY" in $$props) $$invalidate(4, originY = $$props.originY);
    		if ("width" in $$props) $$invalidate(5, width = $$props.width);
    		if ("height" in $$props) $$invalidate(6, height = $$props.height);
    		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
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
    		if (!document.getElementById("svelte-1aoosmb-style")) add_css$6();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			top: 1,
    			left: 2,
    			originX: 3,
    			originY: 4,
    			width: 5,
    			height: 6
    		});
    	}
    }

    /* core\dialog\alert.svelte generated by Svelte v3.38.2 */

    function create_default_slot_5$2(ctx) {
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

    // (32:16) <Button color="secondary" on:tap={ok}>
    function create_default_slot_4$2(ctx) {
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

    // (31:12) <GridLayout>
    function create_default_slot_3$2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*ok*/ ctx[3]);

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

    // (27:8) <ActionLayout>
    function create_default_slot_2$2(ctx) {
    	let flexlayout;
    	let t;
    	let gridlayout;
    	let current;

    	flexlayout = new Flex({
    			props: {
    				$$slots: { default: [create_default_slot_5$2] },
    				$$scope: { ctx }
    			}
    		});

    	gridlayout = new Grid({
    			props: {
    				$$slots: { default: [create_default_slot_3$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flexlayout.$$.fragment);
    			t = space();
    			create_component(gridlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flexlayout, target, anchor);
    			insert(target, t, anchor);
    			mount_component(gridlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flexlayout_changes = {};

    			if (dirty & /*$$scope, message*/ 66) {
    				flexlayout_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout.$set(flexlayout_changes);
    			const gridlayout_changes = {};

    			if (dirty & /*$$scope, okText*/ 68) {
    				gridlayout_changes.$$scope = { dirty, ctx };
    			}

    			gridlayout.$set(gridlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flexlayout.$$.fragment, local);
    			transition_in(gridlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flexlayout.$$.fragment, local);
    			transition_out(gridlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flexlayout, detaching);
    			if (detaching) detach(t);
    			destroy_component(gridlayout, detaching);
    		}
    	};
    }

    // (23:4) <Card>
    function create_default_slot_1$2(ctx) {
    	let actionlayout;
    	let current;

    	actionlayout = new Action({
    			props: {
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(actionlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(actionlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const actionlayout_changes = {};

    			if (dirty & /*$$scope, okText, message*/ 70) {
    				actionlayout_changes.$$scope = { dirty, ctx };
    			}

    			actionlayout.$set(actionlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(actionlayout, detaching);
    		}
    	};
    }

    // (24:8) <svelte:fragment slot="title">
    function create_title_slot$2(ctx) {
    	let t_value = (/*title*/ ctx[0] ?? "") + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1 && t_value !== (t_value = (/*title*/ ctx[0] ?? "") + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (22:0) <DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    function create_default_slot$4(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: {
    					title: [create_title_slot$2],
    					default: [create_default_slot_1$2]
    				},
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

    			if (dirty & /*$$scope, title, okText, message*/ 71) {
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

    function create_fragment$6(ctx) {
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

    			if (dirty & /*$$scope, title, okText, message*/ 71) {
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

    function instance$6($$self, $$props, $$invalidate) {
    	let title;
    	let message;
    	let okText;
    	let { close } = $$props;
    	let { options } = $$props;
    	const ok = () => close(true);

    	$$self.$$set = $$props => {
    		if ("close" in $$props) $$invalidate(4, close = $$props.close);
    		if ("options" in $$props) $$invalidate(5, options = $$props.options);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 32) {
    			$$invalidate(0, { title = "Alert", message, okText = "OK" } = options, title, ($$invalidate(1, message), $$invalidate(5, options)), ($$invalidate(2, okText), $$invalidate(5, options)));
    		}
    	};

    	return [title, message, okText, ok, close, options];
    }

    class Alert extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { close: 4, options: 5 });
    	}
    }

    /* core\dialog\prompt.svelte generated by Svelte v3.38.2 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-1h7ubho-style";
    	style.textContent = "form.svelte-1h7ubho{display:grid}";
    	append(document.head, style);
    }

    // (51:12) <FlexLayout direction="column">
    function create_default_slot_6$1(ctx) {
    	let t0;
    	let t1;
    	let form;
    	let textinput;
    	let updating_value;
    	let current;
    	let mounted;
    	let dispose;

    	function textinput_value_binding(value) {
    		/*textinput_value_binding*/ ctx[12](value);
    	}

    	let textinput_props = {
    		placeholder: /*placeholder*/ ctx[4],
    		type: "text",
    		variant: "outline"
    	};

    	if (/*value*/ ctx[1] !== void 0) {
    		textinput_props.value = /*value*/ ctx[1];
    	}

    	textinput = new Text_input({ props: textinput_props });
    	binding_callbacks.push(() => bind(textinput, "value", textinput_value_binding));
    	/*textinput_binding*/ ctx[13](textinput);

    	return {
    		c() {
    			t0 = text(/*message*/ ctx[3]);
    			t1 = space();
    			form = element("form");
    			create_component(textinput.$$.fragment);
    			attr(form, "class", "svelte-1h7ubho");
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, form, anchor);
    			mount_component(textinput, form, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(form, "submit", /*submitOK*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*message*/ 8) set_data(t0, /*message*/ ctx[3]);
    			const textinput_changes = {};
    			if (dirty & /*placeholder*/ 16) textinput_changes.placeholder = /*placeholder*/ ctx[4];

    			if (!updating_value && dirty & /*value*/ 2) {
    				updating_value = true;
    				textinput_changes.value = /*value*/ ctx[1];
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
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(form);
    			/*textinput_binding*/ ctx[13](null);
    			destroy_component(textinput);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (64:16) <Button color="danger" on:tap={cancel}>
    function create_default_slot_5$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*cancelText*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*cancelText*/ 64) set_data(t, /*cancelText*/ ctx[6]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (67:16) <Button color="secondary" on:tap={ok}>
    function create_default_slot_4$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*okText*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*okText*/ 32) set_data(t, /*okText*/ ctx[5]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (63:12) <GridLayout cols={2}>
    function create_default_slot_3$1(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				color: "danger",
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("tap", /*cancel*/ ctx[9]);

    	button1 = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("tap", /*ok*/ ctx[7]);

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

    			if (dirty & /*$$scope, cancelText*/ 16448) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope, okText*/ 16416) {
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

    // (50:8) <ActionLayout>
    function create_default_slot_2$1(ctx) {
    	let flexlayout;
    	let t;
    	let gridlayout;
    	let current;

    	flexlayout = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	gridlayout = new Grid({
    			props: {
    				cols: 2,
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flexlayout.$$.fragment);
    			t = space();
    			create_component(gridlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flexlayout, target, anchor);
    			insert(target, t, anchor);
    			mount_component(gridlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flexlayout_changes = {};

    			if (dirty & /*$$scope, placeholder, value, textInput, message*/ 16411) {
    				flexlayout_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout.$set(flexlayout_changes);
    			const gridlayout_changes = {};

    			if (dirty & /*$$scope, okText, cancelText*/ 16480) {
    				gridlayout_changes.$$scope = { dirty, ctx };
    			}

    			gridlayout.$set(gridlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flexlayout.$$.fragment, local);
    			transition_in(gridlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flexlayout.$$.fragment, local);
    			transition_out(gridlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flexlayout, detaching);
    			if (detaching) detach(t);
    			destroy_component(gridlayout, detaching);
    		}
    	};
    }

    // (46:4) <Card>
    function create_default_slot_1$1(ctx) {
    	let actionlayout;
    	let current;

    	actionlayout = new Action({
    			props: {
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(actionlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(actionlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const actionlayout_changes = {};

    			if (dirty & /*$$scope, okText, cancelText, placeholder, value, textInput, message*/ 16507) {
    				actionlayout_changes.$$scope = { dirty, ctx };
    			}

    			actionlayout.$set(actionlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(actionlayout, detaching);
    		}
    	};
    }

    // (47:8) <svelte:fragment slot="title">
    function create_title_slot$1(ctx) {
    	let t_value = (/*title*/ ctx[2] ?? "") + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4 && t_value !== (t_value = (/*title*/ ctx[2] ?? "") + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (45:0) <DialogContent top="25%" left="50%" originX="50%" width="min(70vw, 320px)">
    function create_default_slot$3(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: {
    					title: [create_title_slot$1],
    					default: [create_default_slot_1$1]
    				},
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

    			if (dirty & /*$$scope, title, okText, cancelText, placeholder, value, textInput, message*/ 16511) {
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

    function create_fragment$5(ctx) {
    	let dialogcontent;
    	let current;

    	dialogcontent = new Content({
    			props: {
    				top: "25%",
    				left: "50%",
    				originX: "50%",
    				width: "min(70vw, 320px)",
    				$$slots: { default: [create_default_slot$3] },
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

    			if (dirty & /*$$scope, title, okText, cancelText, placeholder, value, textInput, message*/ 16511) {
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

    function instance$5($$self, $$props, $$invalidate) {
    	let title;
    	let message;
    	let placeholder;
    	let okText;
    	let cancelText;
    	let { close } = $$props;
    	let { options } = $$props;
    	const ok = () => close(value);

    	const submitOK = evt => {
    		evt.preventDefault();
    		evt.stopPropagation();
    		ok();
    	};

    	const cancel = () => close(null);
    	let value = "";
    	let textInput = null;

    	function textinput_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	function textinput_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			textInput = $$value;
    			$$invalidate(0, textInput);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("close" in $$props) $$invalidate(10, close = $$props.close);
    		if ("options" in $$props) $$invalidate(11, options = $$props.options);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 2048) {
    			$$invalidate(2, { title = "Confirm", message, placeholder = "", okText = "OK", cancelText = "Cancel" } = options, title, ($$invalidate(3, message), $$invalidate(11, options)), ($$invalidate(4, placeholder), $$invalidate(11, options)), ($$invalidate(5, okText), $$invalidate(11, options)), ($$invalidate(6, cancelText), $$invalidate(11, options)));
    		}

    		if ($$self.$$.dirty & /*textInput*/ 1) {
    			if (textInput !== null) {
    				textInput.focus();
    			}
    		}
    	};

    	return [
    		textInput,
    		value,
    		title,
    		message,
    		placeholder,
    		okText,
    		cancelText,
    		ok,
    		submitOK,
    		cancel,
    		close,
    		options,
    		textinput_value_binding,
    		textinput_binding
    	];
    }

    class Prompt extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1h7ubho-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { close: 10, options: 11 });
    	}
    }

    /* core\action-area.svelte generated by Svelte v3.38.2 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-r1lf7r-style";
    	style.textContent = "action-area.svelte-r1lf7r{--ripple-color:var(--ripple-normal);display:block;overflow:hidden;position:relative;cursor:pointer}";
    	append(document.head, style);
    }

    function create_fragment$4(ctx) {
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
    			set_custom_element_data(action_area, "class", action_area_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-r1lf7r"));
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
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && action_area_class_value !== (action_area_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-r1lf7r"))) {
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;

    	function tap_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [klass, $$scope, slots, tap_handler];
    }

    class Action_area extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-r1lf7r-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { class: 0 });
    	}
    }

    /* core\tabs.svelte generated by Svelte v3.38.2 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-r4ypvu-style";
    	style.textContent = "doric-tabs.svelte-r4ypvu.svelte-r4ypvu{display:grid;grid-template-columns:repeat(var(--tabs), 1fr);background-color:var(--card-background);color:var(--text-normal)}doric-tabs.vertical.svelte-r4ypvu.svelte-r4ypvu{grid-template-columns:1fr;grid-template-rows:repeat(var(--tabs), 1fr)}tab-item.svelte-r4ypvu.svelte-r4ypvu{display:grid;border-width:0px;border-bottom-width:2px;border-style:solid;border-color:transparent}tab-item.selected.svelte-r4ypvu.svelte-r4ypvu{color:var(--primary);border-color:var(--primary)}.vertical.svelte-r4ypvu tab-item.svelte-r4ypvu{border-bottom-width:0px;border-right-width:2px}tab-label.svelte-r4ypvu.svelte-r4ypvu{display:flex;align-items:center;justify-content:center;padding:12px;font-size:var(--text-sixe-header)}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (60:20) {#if option.icon}
    function create_if_block(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: /*option*/ ctx[5].icon } });

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
    			if (dirty & /*options*/ 2) icon_changes.name = /*option*/ ctx[5].icon;
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

    // (58:12) <ActionArea on:tap={change(option.value)}>
    function create_default_slot$2(ctx) {
    	let tab_label;
    	let t0;
    	let t1_value = /*option*/ ctx[5].label + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[5].icon && create_if_block(ctx);

    	return {
    		c() {
    			tab_label = element("tab-label");
    			if (if_block) if_block.c();
    			t0 = space();
    			t1 = text(t1_value);
    			set_custom_element_data(tab_label, "class", "svelte-r4ypvu");
    		},
    		m(target, anchor) {
    			insert(target, tab_label, anchor);
    			if (if_block) if_block.m(tab_label, null);
    			append(tab_label, t0);
    			append(tab_label, t1);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*option*/ ctx[5].icon) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*options*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
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

    			if ((!current || dirty & /*options*/ 2) && t1_value !== (t1_value = /*option*/ ctx[5].label + "")) set_data(t1, t1_value);
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

    // (56:4) {#each options as option (option.value)}
    function create_each_block(key_1, ctx) {
    	let tab_item;
    	let actionarea;
    	let t;
    	let current;

    	actionarea = new Action_area({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	actionarea.$on("tap", function () {
    		if (is_function(/*change*/ ctx[4](/*option*/ ctx[5].value))) /*change*/ ctx[4](/*option*/ ctx[5].value).apply(this, arguments);
    	});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			tab_item = element("tab-item");
    			create_component(actionarea.$$.fragment);
    			t = space();
    			set_custom_element_data(tab_item, "class", "svelte-r4ypvu");
    			toggle_class(tab_item, "selected", /*option*/ ctx[5].value === /*tabGroup*/ ctx[0]);
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

    			if (dirty & /*$$scope, options*/ 258) {
    				actionarea_changes.$$scope = { dirty, ctx };
    			}

    			actionarea.$set(actionarea_changes);

    			if (dirty & /*options, tabGroup*/ 3) {
    				toggle_class(tab_item, "selected", /*option*/ ctx[5].value === /*tabGroup*/ ctx[0]);
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

    function create_fragment$3(ctx) {
    	let doric_tabs;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[1];
    	const get_key = ctx => /*option*/ ctx[5].value;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			doric_tabs = element("doric-tabs");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(doric_tabs, "ignore-titlebar-reskin", "");
    			set_custom_element_data(doric_tabs, "class", "svelte-r4ypvu");
    			toggle_class(doric_tabs, "vertical", /*vertical*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, doric_tabs, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(doric_tabs, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars_1.call(null, doric_tabs, /*tabCount*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*options, tabGroup, change*/ 19) {
    				each_value = /*options*/ ctx[1];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, doric_tabs, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*tabCount*/ 8) vars_action.update.call(null, /*tabCount*/ ctx[3]);

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

    function instance$3($$self, $$props, $$invalidate) {
    	let tabCount;
    	let { tabGroup } = $$props;
    	let { options } = $$props;
    	let { vertical } = $$props;
    	const change = value => () => $$invalidate(0, tabGroup = value);

    	$$self.$$set = $$props => {
    		if ("tabGroup" in $$props) $$invalidate(0, tabGroup = $$props.tabGroup);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("vertical" in $$props) $$invalidate(2, vertical = $$props.vertical);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options*/ 2) {
    			$$invalidate(3, tabCount = { tabs: options.length });
    		}
    	};

    	return [tabGroup, options, vertical, tabCount, change];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-r4ypvu-style")) add_css$3();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { tabGroup: 0, options: 1, vertical: 2 });
    	}
    }

    /* core\tab-panel.svelte generated by Svelte v3.38.2 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-f2qpgf-style";
    	style.textContent = "tab-panel.svelte-f2qpgf{display:none;grid-area:panel}tab-panel.active.svelte-f2qpgf{display:block}";
    	append(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let tab_panel;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			tab_panel = element("tab-panel");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(tab_panel, "class", "svelte-f2qpgf");
    			toggle_class(tab_panel, "active", /*tabGroup*/ ctx[0] === /*value*/ ctx[1]);
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (dirty & /*tabGroup, value*/ 3) {
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
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { tabGroup } = $$props;
    	let { value } = $$props;

    	$$self.$$set = $$props => {
    		if ("tabGroup" in $$props) $$invalidate(0, tabGroup = $$props.tabGroup);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [tabGroup, value, $$scope, slots];
    }

    class Tab_panel extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-f2qpgf-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { tabGroup: 0, value: 1 });
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.38.2 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-m0gj24-style";
    	style.textContent = "drawer-wrapper.svelte-m0gj24{position:absolute;top:0px;left:0px;height:100vh;min-width:5vw;background-color:var(--card-background)}";
    	append(document.head, style);
    }

    // (29:0) <Modal {open} on:close>
    function create_default_slot$1(ctx) {
    	let drawer_wrapper;
    	let drawer_wrapper_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			drawer_wrapper = element("drawer-wrapper");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(drawer_wrapper, "class", "svelte-m0gj24");
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
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
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

    function create_fragment$1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: /*open*/ ctx[0],
    				$$slots: { default: [create_default_slot$1] },
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

    function instance$1($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-m0gj24-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { open: 0 });
    	}
    }

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
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function update_slot_spread(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_spread_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_spread_changes_fn(dirty) | get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
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
    function set_store_value(store, ret, value = ret) {
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
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                const remove = [];
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j++];
                    if (!attributes[attribute.name]) {
                        remove.push(attribute.name);
                    }
                }
                for (let k = 0; k < remove.length; k++) {
                    node.removeAttribute(remove[k]);
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    function query_selector_all(selector, parent = document.body) {
        return Array.from(parent.querySelectorAll(selector));
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
    function hasContext(key) {
        return get_current_component().$$.context.has(key);
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
                str += ` ${name}="${String(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;')}"`;
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
                context: new Map(parent_component ? parent_component.$$.context : context || []),
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
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
     * will throw a type error, so we need to seperate the more strictly typed class.
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
    exports.claim_space = claim_space;
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
    exports.escape = escape;
    exports.escaped = escaped;
    exports.exclude_internal_props = exclude_internal_props;
    exports.fix_and_destroy_block = fix_and_destroy_block;
    exports.fix_and_outro_and_destroy_block = fix_and_outro_and_destroy_block;
    exports.fix_position = fix_position;
    exports.flush = flush;
    exports.getContext = getContext;
    exports.get_binding_group_value = get_binding_group_value;
    exports.get_current_component = get_current_component;
    exports.get_custom_elements_slots = get_custom_elements_slots;
    exports.get_slot_changes = get_slot_changes;
    exports.get_slot_context = get_slot_context;
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
    exports.update_await_block_branch = update_await_block_branch;
    exports.update_keyed_each = update_keyed_each;
    exports.update_slot = update_slot;
    exports.update_slot_spread = update_slot_spread;
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
        const subscribers = [];
        function set(new_value) {
            if (internal$1.safe_not_equal(value, new_value)) {
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
        function subscribe(run, invalidate = internal$1.noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || internal$1.noop;
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

    var hash = hashStore;

    /* demo\src\app.svelte generated by Svelte v3.38.2 */

    const { document: document_1 } = globals;

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1kt789m-style";
    	style.textContent = "page-layout.svelte-1kt789m{display:grid;grid-template-rows:min-content auto}demo-area.svelte-1kt789m{display:block;width:100%;max-width:1024px;margin:auto}";
    	append(document_1.head, style);
    }

    // (144:4) <TitleBar sticky>
    function create_default_slot_33(ctx) {
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

    // (149:16) <Button on:tap={openMenu}>
    function create_default_slot_32(ctx) {
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

    // (148:12) <Adornment position="menu">
    function create_default_slot_31(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_32] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*openMenu*/ ctx[7]);

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

    			if (dirty & /*$$scope*/ 4194304) {
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

    // (162:20) 
    function create_selected_slot(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*selectedItem*/ ctx[21].label + "";
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Theme: ");
    			t1 = text(t1_value);
    			attr(div, "slot", "selected");
    			set_style(div, "white-space", "nowrap");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selectedItem*/ 2097152 && t1_value !== (t1_value = /*selectedItem*/ ctx[21].label + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (154:12) <Adornment position="action">
    function create_default_slot_30(ctx) {
    	let select;
    	let updating_value;
    	let current;

    	function select_value_binding(value) {
    		/*select_value_binding*/ ctx[13](value);
    	}

    	let select_props = {
    		options: /*themeOptions*/ ctx[6],
    		variant: "flat",
    		optionLabel: "Theme",
    		$$slots: {
    			selected: [
    				create_selected_slot,
    				({ selectedItem }) => ({ 21: selectedItem }),
    				({ selectedItem }) => selectedItem ? 2097152 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*themeName*/ ctx[0] !== void 0) {
    		select_props.value = /*themeName*/ ctx[0];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, "value", select_value_binding));

    	return {
    		c() {
    			create_component(select.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const select_changes = {};

    			if (dirty & /*$$scope, selectedItem*/ 6291456) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*themeName*/ 1) {
    				updating_value = true;
    				select_changes.value = /*themeName*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			select.$set(select_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(select, detaching);
    		}
    	};
    }

    // (168:12) <Adornment position="extension">
    function create_default_slot_29(ctx) {
    	let tabs;
    	let updating_tabGroup;
    	let current;

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[14](value);
    	}

    	let tabs_props = { options: /*tabOptions*/ ctx[9] };

    	if (/*tab*/ ctx[4] !== void 0) {
    		tabs_props.tabGroup = /*tab*/ ctx[4];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, "tabGroup", tabs_tabGroup_binding));

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

    			if (!updating_tabGroup && dirty & /*tab*/ 16) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tab*/ ctx[4];
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

    // (147:8) <svelte:fragment slot="adornments">
    function create_adornments_slot(ctx) {
    	let adornment0;
    	let t0;
    	let adornment1;
    	let t1;
    	let adornment2;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "menu",
    				$$slots: { default: [create_default_slot_31] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "action",
    				$$slots: { default: [create_default_slot_30] },
    				$$scope: { ctx }
    			}
    		});

    	adornment2 = new Adornment({
    			props: {
    				position: "extension",
    				$$slots: { default: [create_default_slot_29] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment0.$$.fragment);
    			t0 = space();
    			create_component(adornment1.$$.fragment);
    			t1 = space();
    			create_component(adornment2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(adornment1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(adornment2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope, themeName*/ 4194305) {
    				adornment1_changes.$$scope = { dirty, ctx };
    			}

    			adornment1.$set(adornment1_changes);
    			const adornment2_changes = {};

    			if (dirty & /*$$scope, tab*/ 4194320) {
    				adornment2_changes.$$scope = { dirty, ctx };
    			}

    			adornment2.$set(adornment2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment0.$$.fragment, local);
    			transition_in(adornment1.$$.fragment, local);
    			transition_in(adornment2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment0.$$.fragment, local);
    			transition_out(adornment1.$$.fragment, local);
    			transition_out(adornment2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(adornment1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(adornment2, detaching);
    		}
    	};
    }

    // (177:12) <TitleBar>
    function create_default_slot_28(ctx) {
    	let title_text;

    	return {
    		c() {
    			title_text = element("title-text");
    			title_text.textContent = "Components";
    		},
    		m(target, anchor) {
    			insert(target, title_text, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(title_text);
    		}
    	};
    }

    // (175:8) <Drawer bind:open on:close={closeMenu}>
    function create_default_slot_27(ctx) {
    	let div;
    	let t0;
    	let titlebar;
    	let t1;
    	let tabs;
    	let updating_tabGroup;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				$$slots: { default: [create_default_slot_28] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs_tabGroup_binding_1(value) {
    		/*tabs_tabGroup_binding_1*/ ctx[15](value);
    	}

    	let tabs_props = {
    		options: /*tabOptions*/ ctx[9],
    		vertical: true
    	};

    	if (/*tab*/ ctx[4] !== void 0) {
    		tabs_props.tabGroup = /*tab*/ ctx[4];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, "tabGroup", tabs_tabGroup_binding_1));

    	return {
    		c() {
    			div = element("div");
    			t0 = space();
    			create_component(titlebar.$$.fragment);
    			t1 = space();
    			create_component(tabs.$$.fragment);
    			set_style(div, "width", "15vw");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t0, anchor);
    			mount_component(titlebar, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*tab*/ 16) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tab*/ ctx[4];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t0);
    			destroy_component(titlebar, detaching);
    			if (detaching) detach(t1);
    			destroy_component(tabs, detaching);
    		}
    	};
    }

    // (187:12) <TabPanel value="test" tabGroup={tab}>
    function create_default_slot_26(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Test 1");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (190:12) <TabPanel value="test2" tabGroup={tab}>
    function create_default_slot_25(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Test 2");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (193:12) <TabPanel value="test3" tabGroup={tab}>
    function create_default_slot_24(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Test 3");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (198:20) <FlexLayout direction="column">
    function create_default_slot_23(ctx) {
    	let t0;
    	let div;
    	let t2;
    	let span0;
    	let t4;
    	let span1;

    	return {
    		c() {
    			t0 = text("Some content\r\n                        ");
    			div = element("div");
    			div.textContent = "hi";
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "Line 3?";
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Line 4?";
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			insert(target, t2, anchor);
    			insert(target, span0, anchor);
    			insert(target, t4, anchor);
    			insert(target, span1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			if (detaching) detach(t2);
    			if (detaching) detach(span0);
    			if (detaching) detach(t4);
    			if (detaching) detach(span1);
    		}
    	};
    }

    // (197:16) <Card>
    function create_default_slot_22(ctx) {
    	let flexlayout;
    	let current;

    	flexlayout = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_23] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flexlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flexlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flexlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				flexlayout_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout.$set(flexlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flexlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flexlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flexlayout, detaching);
    		}
    	};
    }

    // (209:20) <FlexLayout direction="column">
    function create_default_slot_21(ctx) {
    	let t0;
    	let div;
    	let t2;
    	let span0;
    	let t4;
    	let span1;

    	return {
    		c() {
    			t0 = text("Some content\r\n                        ");
    			div = element("div");
    			div.textContent = "hi";
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "Line 3?";
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Line 4?";
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			insert(target, t2, anchor);
    			insert(target, span0, anchor);
    			insert(target, t4, anchor);
    			insert(target, span1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			if (detaching) detach(t2);
    			if (detaching) detach(span0);
    			if (detaching) detach(t4);
    			if (detaching) detach(span1);
    		}
    	};
    }

    // (205:16) <Card color="primary">
    function create_default_slot_20(ctx) {
    	let flexlayout;
    	let current;

    	flexlayout = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_21] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flexlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flexlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flexlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				flexlayout_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout.$set(flexlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flexlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flexlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flexlayout, detaching);
    		}
    	};
    }

    // (206:20) <svelte:fragment slot="title">
    function create_title_slot_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Title Text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (224:24) <FlexLayout direction="column">
    function create_default_slot_19(ctx) {
    	let t0;
    	let div;
    	let t2;
    	let span0;
    	let t4;
    	let span1;

    	return {
    		c() {
    			t0 = text("Some content\r\n                            ");
    			div = element("div");
    			div.textContent = "hi";
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "Line 3?";
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Line 4?";
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			insert(target, t2, anchor);
    			insert(target, span0, anchor);
    			insert(target, t4, anchor);
    			insert(target, span1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			if (detaching) detach(t2);
    			if (detaching) detach(span0);
    			if (detaching) detach(t4);
    			if (detaching) detach(span1);
    		}
    	};
    }

    // (232:28) <Button color="primary">
    function create_default_slot_18(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Maybe");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (233:28) <Button color="danger">
    function create_default_slot_17(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Nope");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (235:28) <Button color="secondary">
    function create_default_slot_16(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Sure");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (231:24) <FlexLayout direction="column" itemFill>
    function create_default_slot_15(ctx) {
    	let button0;
    	let t0;
    	let button1;
    	let t1;
    	let flex_break;
    	let t2;
    	let button2;
    	let current;

    	button0 = new Button({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_18] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				color: "danger",
    				$$slots: { default: [create_default_slot_17] },
    				$$scope: { ctx }
    			}
    		});

    	button2 = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_16] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t0 = space();
    			create_component(button1.$$.fragment);
    			t1 = space();
    			flex_break = element("flex-break");
    			t2 = space();
    			create_component(button2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(button1, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, flex_break, anchor);
    			insert(target, t2, anchor);
    			mount_component(button2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(button1, detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(flex_break);
    			if (detaching) detach(t2);
    			destroy_component(button2, detaching);
    		}
    	};
    }

    // (223:20) <ActionLayout>
    function create_default_slot_14(ctx) {
    	let flexlayout0;
    	let t;
    	let flexlayout1;
    	let current;

    	flexlayout0 = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_19] },
    				$$scope: { ctx }
    			}
    		});

    	flexlayout1 = new Flex({
    			props: {
    				direction: "column",
    				itemFill: true,
    				$$slots: { default: [create_default_slot_15] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flexlayout0.$$.fragment);
    			t = space();
    			create_component(flexlayout1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flexlayout0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(flexlayout1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flexlayout0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				flexlayout0_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout0.$set(flexlayout0_changes);
    			const flexlayout1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				flexlayout1_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout1.$set(flexlayout1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flexlayout0.$$.fragment, local);
    			transition_in(flexlayout1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flexlayout0.$$.fragment, local);
    			transition_out(flexlayout1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flexlayout0, detaching);
    			if (detaching) detach(t);
    			destroy_component(flexlayout1, detaching);
    		}
    	};
    }

    // (219:16) <Card color="secondary">
    function create_default_slot_13(ctx) {
    	let actionlayout;
    	let current;

    	actionlayout = new Action({
    			props: {
    				$$slots: { default: [create_default_slot_14] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(actionlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(actionlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const actionlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				actionlayout_changes.$$scope = { dirty, ctx };
    			}

    			actionlayout.$set(actionlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(actionlayout, detaching);
    		}
    	};
    }

    // (220:20) <svelte:fragment slot="title">
    function create_title_slot_1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Title Text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (244:24) <FlexLayout direction="column">
    function create_default_slot_12(ctx) {
    	let t0;
    	let div;
    	let t2;
    	let span0;
    	let t4;
    	let span1;

    	return {
    		c() {
    			t0 = text("Some content\r\n                            ");
    			div = element("div");
    			div.textContent = "hi";
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "Line 3?";
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Line 4?";
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			insert(target, t2, anchor);
    			insert(target, span0, anchor);
    			insert(target, t4, anchor);
    			insert(target, span1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			if (detaching) detach(t2);
    			if (detaching) detach(span0);
    			if (detaching) detach(t4);
    			if (detaching) detach(span1);
    		}
    	};
    }

    // (252:28) <Button color="primary">
    function create_default_slot_11(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Maybe");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (253:28) <Button color="danger">
    function create_default_slot_10(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Nope");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (254:28) <Button color="secondary">
    function create_default_slot_9(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Sure");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (251:24) <GridLayout rows={2} direction="column">
    function create_default_slot_8(ctx) {
    	let button0;
    	let t0;
    	let button1;
    	let t1;
    	let button2;
    	let current;

    	button0 = new Button({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			}
    		});

    	button1 = new Button({
    			props: {
    				color: "danger",
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			}
    		});

    	button2 = new Button({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t0 = space();
    			create_component(button1.$$.fragment);
    			t1 = space();
    			create_component(button2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(button1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(button2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(button1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(button2, detaching);
    		}
    	};
    }

    // (243:20) <ActionLayout>
    function create_default_slot_7(ctx) {
    	let flexlayout;
    	let t;
    	let gridlayout;
    	let current;

    	flexlayout = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			}
    		});

    	gridlayout = new Grid({
    			props: {
    				rows: 2,
    				direction: "column",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(flexlayout.$$.fragment);
    			t = space();
    			create_component(gridlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(flexlayout, target, anchor);
    			insert(target, t, anchor);
    			mount_component(gridlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const flexlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				flexlayout_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout.$set(flexlayout_changes);
    			const gridlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				gridlayout_changes.$$scope = { dirty, ctx };
    			}

    			gridlayout.$set(gridlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(flexlayout.$$.fragment, local);
    			transition_in(gridlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(flexlayout.$$.fragment, local);
    			transition_out(gridlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(flexlayout, detaching);
    			if (detaching) detach(t);
    			destroy_component(gridlayout, detaching);
    		}
    	};
    }

    // (239:16) <Card color="danger">
    function create_default_slot_6(ctx) {
    	let actionlayout;
    	let current;

    	actionlayout = new Action({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(actionlayout.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(actionlayout, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const actionlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				actionlayout_changes.$$scope = { dirty, ctx };
    			}

    			actionlayout.$set(actionlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(actionlayout.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(actionlayout.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(actionlayout, detaching);
    		}
    	};
    }

    // (240:20) <svelte:fragment slot="title">
    function create_title_slot(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Title Text");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (265:24) <Button variant="outline">
    function create_default_slot_5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Start");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (264:20) <Adornment position="start">
    function create_default_slot_4(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot_5] },
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

    			if (dirty & /*$$scope*/ 4194304) {
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

    // (270:24) <Button variant="outline">
    function create_default_slot_3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("End");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (269:20) <Adornment position="end">
    function create_default_slot_2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: "outline",
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

    			if (dirty & /*$$scope*/ 4194304) {
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

    // (263:16) <TextInput variant="outline">
    function create_default_slot_1(ctx) {
    	let adornment0;
    	let t;
    	let adornment1;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_2] },
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

    			if (dirty & /*$$scope*/ 4194304) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
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

    // (196:12) <FlexLayout gap="4px" itemFill>
    function create_default_slot(ctx) {
    	let card0;
    	let t0;
    	let card1;
    	let t1;
    	let flex_break0;
    	let t2;
    	let card2;
    	let t3;
    	let card3;
    	let t4;
    	let textinput0;
    	let t5;
    	let flex_break1;
    	let t6;
    	let textinput1;
    	let t7;
    	let textinput2;
    	let current;

    	card0 = new Card({
    			props: {
    				$$slots: { default: [create_default_slot_22] },
    				$$scope: { ctx }
    			}
    		});

    	card1 = new Card({
    			props: {
    				color: "primary",
    				$$slots: {
    					title: [create_title_slot_2],
    					default: [create_default_slot_20]
    				},
    				$$scope: { ctx }
    			}
    		});

    	card2 = new Card({
    			props: {
    				color: "secondary",
    				$$slots: {
    					title: [create_title_slot_1],
    					default: [create_default_slot_13]
    				},
    				$$scope: { ctx }
    			}
    		});

    	card3 = new Card({
    			props: {
    				color: "danger",
    				$$slots: {
    					title: [create_title_slot],
    					default: [create_default_slot_6]
    				},
    				$$scope: { ctx }
    			}
    		});

    	textinput0 = new Text_input({
    			props: { variant: "outline", label: "Testing" }
    		});

    	textinput1 = new Text_input({ props: { error: "Empty" } });

    	textinput2 = new Text_input({
    			props: {
    				variant: "outline",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card0.$$.fragment);
    			t0 = space();
    			create_component(card1.$$.fragment);
    			t1 = space();
    			flex_break0 = element("flex-break");
    			t2 = space();
    			create_component(card2.$$.fragment);
    			t3 = space();
    			create_component(card3.$$.fragment);
    			t4 = space();
    			create_component(textinput0.$$.fragment);
    			t5 = space();
    			flex_break1 = element("flex-break");
    			t6 = space();
    			create_component(textinput1.$$.fragment);
    			t7 = space();
    			create_component(textinput2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(card1, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, flex_break0, anchor);
    			insert(target, t2, anchor);
    			mount_component(card2, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(card3, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(textinput0, target, anchor);
    			insert(target, t5, anchor);
    			insert(target, flex_break1, anchor);
    			insert(target, t6, anchor);
    			mount_component(textinput1, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(textinput2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const card0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				card0_changes.$$scope = { dirty, ctx };
    			}

    			card0.$set(card0_changes);
    			const card1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				card1_changes.$$scope = { dirty, ctx };
    			}

    			card1.$set(card1_changes);
    			const card2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				card2_changes.$$scope = { dirty, ctx };
    			}

    			card2.$set(card2_changes);
    			const card3_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				card3_changes.$$scope = { dirty, ctx };
    			}

    			card3.$set(card3_changes);
    			const textinput2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				textinput2_changes.$$scope = { dirty, ctx };
    			}

    			textinput2.$set(textinput2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card0.$$.fragment, local);
    			transition_in(card1.$$.fragment, local);
    			transition_in(card2.$$.fragment, local);
    			transition_in(card3.$$.fragment, local);
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(textinput2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card0.$$.fragment, local);
    			transition_out(card1.$$.fragment, local);
    			transition_out(card2.$$.fragment, local);
    			transition_out(card3.$$.fragment, local);
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(card1, detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(flex_break0);
    			if (detaching) detach(t2);
    			destroy_component(card2, detaching);
    			if (detaching) detach(t3);
    			destroy_component(card3, detaching);
    			if (detaching) detach(t4);
    			destroy_component(textinput0, detaching);
    			if (detaching) detach(t5);
    			if (detaching) detach(flex_break1);
    			if (detaching) detach(t6);
    			destroy_component(textinput1, detaching);
    			if (detaching) detach(t7);
    			destroy_component(textinput2, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let appstyle;
    	let t0;
    	let dialog0;
    	let t1;
    	let dialog1;
    	let t2;
    	let page_layout;
    	let titlebar;
    	let t3;
    	let drawer;
    	let updating_open;
    	let t4;
    	let demo_area;
    	let tabs;
    	let updating_tabGroup;
    	let t5;
    	let tabpanel0;
    	let t6;
    	let tabpanel1;
    	let t7;
    	let tabpanel2;
    	let t8;
    	let flexlayout;
    	let t9;
    	let circlespinner;
    	let t10;
    	let hexagonspinner;
    	let current;

    	appstyle = new App_style({
    			props: { theme: /*theme*/ ctx[5], baseline: Baseline }
    		});

    	let dialog0_props = { component: Alert, persistent: true };
    	dialog0 = new Dialog({ props: dialog0_props });
    	/*dialog0_binding*/ ctx[11](dialog0);
    	let dialog1_props = { component: Prompt, persistent: true };
    	dialog1 = new Dialog({ props: dialog1_props });
    	/*dialog1_binding*/ ctx[12](dialog1);

    	titlebar = new Title_bar({
    			props: {
    				sticky: true,
    				$$slots: {
    					adornments: [create_adornments_slot],
    					default: [create_default_slot_33]
    				},
    				$$scope: { ctx }
    			}
    		});

    	function drawer_open_binding(value) {
    		/*drawer_open_binding*/ ctx[16](value);
    	}

    	let drawer_props = {
    		$$slots: { default: [create_default_slot_27] },
    		$$scope: { ctx }
    	};

    	if (/*open*/ ctx[3] !== void 0) {
    		drawer_props.open = /*open*/ ctx[3];
    	}

    	drawer = new Drawer({ props: drawer_props });
    	binding_callbacks.push(() => bind(drawer, "open", drawer_open_binding));
    	drawer.$on("close", /*closeMenu*/ ctx[8]);

    	function tabs_tabGroup_binding_2(value) {
    		/*tabs_tabGroup_binding_2*/ ctx[17](value);
    	}

    	let tabs_props = { options: /*tabOptions*/ ctx[9] };

    	if (/*tab*/ ctx[4] !== void 0) {
    		tabs_props.tabGroup = /*tab*/ ctx[4];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, "tabGroup", tabs_tabGroup_binding_2));

    	tabpanel0 = new Tab_panel({
    			props: {
    				value: "test",
    				tabGroup: /*tab*/ ctx[4],
    				$$slots: { default: [create_default_slot_26] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel1 = new Tab_panel({
    			props: {
    				value: "test2",
    				tabGroup: /*tab*/ ctx[4],
    				$$slots: { default: [create_default_slot_25] },
    				$$scope: { ctx }
    			}
    		});

    	tabpanel2 = new Tab_panel({
    			props: {
    				value: "test3",
    				tabGroup: /*tab*/ ctx[4],
    				$$slots: { default: [create_default_slot_24] },
    				$$scope: { ctx }
    			}
    		});

    	flexlayout = new Flex({
    			props: {
    				gap: "4px",
    				itemFill: true,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	circlespinner = new Circle_spinner({});
    	hexagonspinner = new Hexagon_spinner({});

    	return {
    		c() {
    			create_component(appstyle.$$.fragment);
    			t0 = space();
    			create_component(dialog0.$$.fragment);
    			t1 = space();
    			create_component(dialog1.$$.fragment);
    			t2 = space();
    			page_layout = element("page-layout");
    			create_component(titlebar.$$.fragment);
    			t3 = space();
    			create_component(drawer.$$.fragment);
    			t4 = space();
    			demo_area = element("demo-area");
    			create_component(tabs.$$.fragment);
    			t5 = space();
    			create_component(tabpanel0.$$.fragment);
    			t6 = space();
    			create_component(tabpanel1.$$.fragment);
    			t7 = space();
    			create_component(tabpanel2.$$.fragment);
    			t8 = space();
    			create_component(flexlayout.$$.fragment);
    			t9 = text("\r\n\r\n            Doric Components?\r\n            ");
    			create_component(circlespinner.$$.fragment);
    			t10 = space();
    			create_component(hexagonspinner.$$.fragment);
    			set_custom_element_data(demo_area, "class", "svelte-1kt789m");
    			set_custom_element_data(page_layout, "class", "svelte-1kt789m");
    		},
    		m(target, anchor) {
    			mount_component(appstyle, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(dialog0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(dialog1, target, anchor);
    			insert(target, t2, anchor);
    			insert(target, page_layout, anchor);
    			mount_component(titlebar, page_layout, null);
    			append(page_layout, t3);
    			mount_component(drawer, page_layout, null);
    			append(page_layout, t4);
    			append(page_layout, demo_area);
    			mount_component(tabs, demo_area, null);
    			append(demo_area, t5);
    			mount_component(tabpanel0, demo_area, null);
    			append(demo_area, t6);
    			mount_component(tabpanel1, demo_area, null);
    			append(demo_area, t7);
    			mount_component(tabpanel2, demo_area, null);
    			append(demo_area, t8);
    			mount_component(flexlayout, demo_area, null);
    			append(demo_area, t9);
    			mount_component(circlespinner, demo_area, null);
    			append(demo_area, t10);
    			mount_component(hexagonspinner, demo_area, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const appstyle_changes = {};
    			if (dirty & /*theme*/ 32) appstyle_changes.theme = /*theme*/ ctx[5];
    			appstyle.$set(appstyle_changes);
    			const dialog0_changes = {};
    			dialog0.$set(dialog0_changes);
    			const dialog1_changes = {};
    			dialog1.$set(dialog1_changes);
    			const titlebar_changes = {};

    			if (dirty & /*$$scope, tab, themeName*/ 4194321) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const drawer_changes = {};

    			if (dirty & /*$$scope, tab*/ 4194320) {
    				drawer_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_open && dirty & /*open*/ 8) {
    				updating_open = true;
    				drawer_changes.open = /*open*/ ctx[3];
    				add_flush_callback(() => updating_open = false);
    			}

    			drawer.$set(drawer_changes);
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*tab*/ 16) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*tab*/ ctx[4];
    				add_flush_callback(() => updating_tabGroup = false);
    			}

    			tabs.$set(tabs_changes);
    			const tabpanel0_changes = {};
    			if (dirty & /*tab*/ 16) tabpanel0_changes.tabGroup = /*tab*/ ctx[4];

    			if (dirty & /*$$scope*/ 4194304) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};
    			if (dirty & /*tab*/ 16) tabpanel1_changes.tabGroup = /*tab*/ ctx[4];

    			if (dirty & /*$$scope*/ 4194304) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};
    			if (dirty & /*tab*/ 16) tabpanel2_changes.tabGroup = /*tab*/ ctx[4];

    			if (dirty & /*$$scope*/ 4194304) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    			const flexlayout_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				flexlayout_changes.$$scope = { dirty, ctx };
    			}

    			flexlayout.$set(flexlayout_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appstyle.$$.fragment, local);
    			transition_in(dialog0.$$.fragment, local);
    			transition_in(dialog1.$$.fragment, local);
    			transition_in(titlebar.$$.fragment, local);
    			transition_in(drawer.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			transition_in(flexlayout.$$.fragment, local);
    			transition_in(circlespinner.$$.fragment, local);
    			transition_in(hexagonspinner.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appstyle.$$.fragment, local);
    			transition_out(dialog0.$$.fragment, local);
    			transition_out(dialog1.$$.fragment, local);
    			transition_out(titlebar.$$.fragment, local);
    			transition_out(drawer.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
    			transition_out(flexlayout.$$.fragment, local);
    			transition_out(circlespinner.$$.fragment, local);
    			transition_out(hexagonspinner.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appstyle, detaching);
    			if (detaching) detach(t0);
    			/*dialog0_binding*/ ctx[11](null);
    			destroy_component(dialog0, detaching);
    			if (detaching) detach(t1);
    			/*dialog1_binding*/ ctx[12](null);
    			destroy_component(dialog1, detaching);
    			if (detaching) detach(t2);
    			if (detaching) detach(page_layout);
    			destroy_component(titlebar);
    			destroy_component(drawer);
    			destroy_component(tabs);
    			destroy_component(tabpanel0);
    			destroy_component(tabpanel1);
    			destroy_component(tabpanel2);
    			destroy_component(flexlayout);
    			destroy_component(circlespinner);
    			destroy_component(hexagonspinner);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let theme;
    	let $hash;
    	component_subscribe($$self, hash, $$value => $$invalidate(10, $hash = $$value));
    	const onPage = typeof document !== "undefined";

    	const ssrStorage = {
    		read: name => {
    			if (onPage === false) {
    				return null;
    			}

    			const stored = localStorage.getItem(name);

    			if (stored === null) {
    				return null;
    			}

    			return JSON.parse(stored);
    		},
    		write: (name, value) => {
    			if (onPage === false) {
    				return;
    			}

    			localStorage.setItem(name, JSON.stringify(value));
    		}
    	};

    	// let themeName = JSON.parse(localStorage.theme ?? `"light"`)
    	let themeName = ssrStorage.read("theme") ?? "light";

    	const themeOptions = [
    		{ label: "Light", value: "light" },
    		{ label: "Dark", value: "dark" },
    		{ label: "Tron", value: "tron" }
    	];

    	const themeMap = {
    		light: Light,
    		dark: Dark,
    		tron: Tron
    	};

    	let wat = null;
    	let wat2 = null;

    	// const openMenu = async () => console.log(
    	//     await wat2.show({
    	//         title: "Test",
    	//         message: "Nope?",
    	//         placeholder: "Some Example"
    	//     })
    	// )
    	// const componentList = [
    	//     // ["adornment", "Adornment", AdornmentDemo],
    	//     ["button", "Button", ButtonDemo],
    	// ]
    	// console.log(componentList)
    	// const demos = {
    	//     // "app-bar": TitleBarDemo,
    	//     "button": ButtonDemo,
    	//     "chip": ChipDemo,
    	//     // "list": ListDemo,
    	//     // "textArea": TextAreaDemo,
    	//     // "textInput": TextInputDemo,
    	//     // table: TableDemo,
    	//     // checkbox: CheckboxDemo,
    	// }
    	// const demoList = Object.keys(demos).sort()
    	// const nav = location =>
    	//     () => document.location.hash = `/${location}`
    	let open = false;

    	const openMenu = () => $$invalidate(3, open = true);
    	const closeMenu = () => $$invalidate(3, open = false);
    	let tab = "test";

    	const tabOptions = [
    		{
    			label: "test",
    			value: "test",
    			icon: "add"
    		},
    		{
    			label: "test2",
    			value: "test2",
    			icon: "remove"
    		},
    		{
    			label: "test3",
    			value: "test3",
    			icon: "science"
    		}
    	];

    	function dialog0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wat = $$value;
    			$$invalidate(1, wat);
    		});
    	}

    	function dialog1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wat2 = $$value;
    			$$invalidate(2, wat2);
    		});
    	}

    	function select_value_binding(value) {
    		themeName = value;
    		$$invalidate(0, themeName);
    	}

    	function tabs_tabGroup_binding(value) {
    		tab = value;
    		$$invalidate(4, tab);
    	}

    	function tabs_tabGroup_binding_1(value) {
    		tab = value;
    		$$invalidate(4, tab);
    	}

    	function drawer_open_binding(value) {
    		open = value;
    		$$invalidate(3, open);
    	}

    	function tabs_tabGroup_binding_2(value) {
    		tab = value;
    		$$invalidate(4, tab);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*themeName*/ 1) {
    			$$invalidate(5, theme = themeMap[themeName]);
    		}

    		if ($$self.$$.dirty & /*themeName*/ 1) {
    			// $: localStorage.theme = JSON.stringify(themeName)
    			ssrStorage.write("theme", themeName);
    		}

    		if ($$self.$$.dirty & /*$hash*/ 1024) {
    			closeMenu();
    		}
    	};

    	return [
    		themeName,
    		wat,
    		wat2,
    		open,
    		tab,
    		theme,
    		themeOptions,
    		openMenu,
    		closeMenu,
    		tabOptions,
    		$hash,
    		dialog0_binding,
    		dialog1_binding,
    		select_value_binding,
    		tabs_tabGroup_binding,
    		tabs_tabGroup_binding_1,
    		drawer_open_binding,
    		tabs_tabGroup_binding_2
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document_1.getElementById("svelte-1kt789m-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    var main = new App({
        target: document.body,
    });

    return main;

}());
