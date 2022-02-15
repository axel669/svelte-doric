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

    function add_css$g(target) {
    	append_styles(target, "svelte-acwzgw", "ripple-wrapper.svelte-acwzgw{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-acwzgw{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}");
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (107:4) {#each ripples as info (info.id)}
    function create_each_block$1(key_1, ctx) {
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

    function create_fragment$l(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[8].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
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
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block$1, null, get_each_context$1);
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

    function instance$k($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$k, create_fragment$l, safe_not_equal, { color: 0, disabled: 5 }, add_css$g);
    	}
    }

    /* core\action-area.svelte generated by Svelte v3.44.2 */

    function add_css$f(target) {
    	append_styles(target, "svelte-qjr29k", "action-area.svelte-qjr29k{--ripple-color:var(--ripple-normal);display:grid;overflow:hidden;position:relative;cursor:pointer}");
    }

    function create_fragment$k(ctx) {
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

    function instance$j($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$j, create_fragment$k, safe_not_equal, { class: 0 }, add_css$f);
    	}
    }

    /* core\adornment.svelte generated by Svelte v3.44.2 */

    function add_css$e(target) {
    	append_styles(target, "svelte-1ffngwk", "doric-adornment.svelte-1ffngwk{display:grid;grid-area:var(--position);padding:4px}");
    }

    function create_fragment$j(ctx) {
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
    			set_custom_element_data(doric_adornment, "class", "svelte-1ffngwk");
    		},
    		m(target, anchor) {
    			insert(target, doric_adornment, anchor);

    			if (default_slot) {
    				default_slot.m(doric_adornment, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_adornment, /*positionVars*/ ctx[0]));
    				mounted = true;
    			}
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

    function instance$i($$self, $$props, $$invalidate) {
    	let positionVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { position = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ('position' in $$props) $$invalidate(1, position = $$props.position);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
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
    		init(this, options, instance$i, create_fragment$j, safe_not_equal, { position: 1 }, add_css$e);
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

    function create_fragment$i(ctx) {
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

    function instance$h($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$h, create_fragment$i, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

    /* core\baseline.svelte generated by Svelte v3.44.2 */

    function add_css$d(target) {
    	append_styles(target, "svelte-74u6mc", "*{box-sizing:border-box}html{margin:0px;padding:0px;width:100%;height:100%}body{margin:0px;padding:0px;width:100%;height:100%;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--layer-border-color);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert)}");
    }

    function create_fragment$h(ctx) {
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
    			attr(link1, "href", "https://fonts.googleapis.com/css?family=Orbitron:300,400,500,700");
    			attr(link1, "rel", "stylesheet");
    			attr(link1, "type", "text/css");
    			attr(link2, "rel", "stylesheet");
    			attr(link2, "href", "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css");
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
    		init(this, options, null, create_fragment$h, safe_not_equal, {}, add_css$d);
    	}
    }

    /* core\button.svelte generated by Svelte v3.44.2 */

    function add_css$c(target) {
    	append_styles(target, "svelte-lsiapg", "doric-button.svelte-lsiapg{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;z-index:+1;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}.round.svelte-lsiapg{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.action.svelte-lsiapg{width:var(--button-round-size);padding:0px}.adorn.svelte-lsiapg{padding-top:2px;padding-bottom:2px}.disabled.svelte-lsiapg{filter:contrast(50%)}.primary.svelte-lsiapg{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-lsiapg{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-lsiapg{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-lsiapg{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--text-color)}.outline.svelte-lsiapg{border:1px solid var(--button-color);color:var(--button-color)}");
    }

    function create_fragment$g(ctx) {
    	let doric_button;
    	let t;
    	let ripple;
    	let doric_button_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[2] } });

    	return {
    		c() {
    			doric_button = element("doric-button");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(doric_button, "class", doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[6] + " svelte-lsiapg"));
    			toggle_class(doric_button, "disabled", /*disabled*/ ctx[2]);
    			toggle_class(doric_button, "round", /*round*/ ctx[3]);
    			toggle_class(doric_button, "action", /*action*/ ctx[4]);
    			toggle_class(doric_button, "adorn", /*adorn*/ ctx[5]);
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

    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 4) ripple_changes.disabled = /*disabled*/ ctx[2];
    			ripple.$set(ripple_changes);

    			if (!current || dirty & /*color, variant, klass*/ 67 && doric_button_class_value !== (doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[6] + " svelte-lsiapg"))) {
    				set_custom_element_data(doric_button, "class", doric_button_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 128) vars_action.update.call(null, /*buttonVars*/ ctx[7]);

    			if (dirty & /*color, variant, klass, disabled*/ 71) {
    				toggle_class(doric_button, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*color, variant, klass, round*/ 75) {
    				toggle_class(doric_button, "round", /*round*/ ctx[3]);
    			}

    			if (dirty & /*color, variant, klass, action*/ 83) {
    				toggle_class(doric_button, "action", /*action*/ ctx[4]);
    			}

    			if (dirty & /*color, variant, klass, adorn*/ 99) {
    				toggle_class(doric_button, "adorn", /*adorn*/ ctx[5]);
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

    function instance$g($$self, $$props, $$invalidate) {
    	let buttonVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { color = "default" } = $$props;
    	let { variant = "normal" } = $$props;
    	let { disabled = false } = $$props;
    	let { round } = $$props;
    	let { action } = $$props;
    	let { adorn } = $$props;
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
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('variant' in $$props) $$invalidate(1, variant = $$props.variant);
    		if ('disabled' in $$props) $$invalidate(2, disabled = $$props.disabled);
    		if ('round' in $$props) $$invalidate(3, round = $$props.round);
    		if ('action' in $$props) $$invalidate(4, action = $$props.action);
    		if ('adorn' in $$props) $$invalidate(5, adorn = $$props.adorn);
    		if ('class' in $$props) $$invalidate(6, klass = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*round*/ 8) {
    			$$invalidate(7, buttonVars = { "button-round-size": round });
    		}
    	};

    	return [
    		color,
    		variant,
    		disabled,
    		round,
    		action,
    		adorn,
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

    		init(
    			this,
    			options,
    			instance$g,
    			create_fragment$g,
    			safe_not_equal,
    			{
    				color: 0,
    				variant: 1,
    				disabled: 2,
    				round: 3,
    				action: 4,
    				adorn: 5,
    				class: 6
    			},
    			add_css$c
    		);
    	}
    }

    /* core\toggle\base.svelte generated by Svelte v3.44.2 */

    function add_css$b(target) {
    	append_styles(target, "svelte-tgukdh", "toggle-wrapper.svelte-tgukdh.svelte-tgukdh{position:relative;display:inline-grid;border-radius:4px;overflow:hidden;column-gap:4px;user-select:none}toggle-wrapper.svelte-tgukdh .svelte-tgukdh:first-child{grid-area:symbol;align-self:center;justify-self:center}toggle-wrapper.svelte-tgukdh>.svelte-tgukdh:nth-child(2){grid-area:label}.disabled.svelte-tgukdh.svelte-tgukdh{filter:contrast(50%);cursor:default}.right.svelte-tgukdh.svelte-tgukdh{grid-template-columns:min-content auto;grid-template-areas:\"symbol label\"\r\n        }.left.svelte-tgukdh.svelte-tgukdh{grid-template-columns:auto min-content;grid-template-areas:\"label symbol\"\r\n        }.top.svelte-tgukdh.svelte-tgukdh{grid-template-rows:auto min-content;grid-template-areas:\"label\"\r\n            \"symbol\"\r\n        }.bottom.svelte-tgukdh.svelte-tgukdh{grid-template-rows:min-content auto;grid-template-areas:\"symbol\"\r\n            \"label\"\r\n        }toggle-wrapper.top.svelte-tgukdh>.svelte-tgukdh,toggle-wrapper.bottom.svelte-tgukdh>.svelte-tgukdh{justify-content:center}toggle-label.svelte-tgukdh.svelte-tgukdh{display:grid;align-items:center}.labelToggle.svelte-tgukdh.svelte-tgukdh{cursor:pointer}");
    }

    const get_label_slot_changes = dirty => ({});
    const get_label_slot_context = ctx => ({});

    function create_fragment$f(ctx) {
    	let toggle_wrapper;
    	let t;
    	let toggle_label;
    	let toggle_wrapper_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);
    	const label_slot_template = /*#slots*/ ctx[10].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[9], get_label_slot_context);

    	return {
    		c() {
    			toggle_wrapper = element("toggle-wrapper");
    			if (default_slot) default_slot.c();
    			t = space();
    			toggle_label = element("toggle-label");
    			if (label_slot) label_slot.c();
    			set_custom_element_data(toggle_label, "class", "svelte-tgukdh");
    			toggle_class(toggle_label, "labelToggle", /*labelToggle*/ ctx[1]);
    			set_custom_element_data(toggle_wrapper, "class", toggle_wrapper_class_value = "" + (/*labelPlacement*/ ctx[2] + " " + /*klass*/ ctx[3] + " svelte-tgukdh"));
    			toggle_class(toggle_wrapper, "disabled", /*disabled*/ ctx[0]);
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

    			/*toggle_label_binding*/ ctx[11](toggle_label);
    			current = true;

    			if (!mounted) {
    				dispose = listen(toggle_wrapper, "tap", /*boxTap*/ ctx[5]);
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

    			if (label_slot) {
    				if (label_slot.p && (!current || dirty & /*$$scope*/ 512)) {
    					update_slot_base(
    						label_slot,
    						label_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(label_slot_template, /*$$scope*/ ctx[9], dirty, get_label_slot_changes),
    						get_label_slot_context
    					);
    				}
    			}

    			if (dirty & /*labelToggle*/ 2) {
    				toggle_class(toggle_label, "labelToggle", /*labelToggle*/ ctx[1]);
    			}

    			if (!current || dirty & /*labelPlacement, klass*/ 12 && toggle_wrapper_class_value !== (toggle_wrapper_class_value = "" + (/*labelPlacement*/ ctx[2] + " " + /*klass*/ ctx[3] + " svelte-tgukdh"))) {
    				set_custom_element_data(toggle_wrapper, "class", toggle_wrapper_class_value);
    			}

    			if (dirty & /*labelPlacement, klass, disabled*/ 13) {
    				toggle_class(toggle_wrapper, "disabled", /*disabled*/ ctx[0]);
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
    			/*toggle_label_binding*/ ctx[11](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { checked = false } = $$props;
    	let { toggle } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { labelToggle = true } = $$props;
    	let { labelPlacement = "right" } = $$props;
    	let { class: klass = "" } = $$props;
    	let labelElement;

    	const boxTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		if (labelToggle === false && labelElement.contains(evt.target)) {
    			return;
    		}

    		toggle();
    	};

    	function toggle_label_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			labelElement = $$value;
    			$$invalidate(4, labelElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('checked' in $$props) $$invalidate(6, checked = $$props.checked);
    		if ('toggle' in $$props) $$invalidate(7, toggle = $$props.toggle);
    		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ('color' in $$props) $$invalidate(8, color = $$props.color);
    		if ('labelToggle' in $$props) $$invalidate(1, labelToggle = $$props.labelToggle);
    		if ('labelPlacement' in $$props) $$invalidate(2, labelPlacement = $$props.labelPlacement);
    		if ('class' in $$props) $$invalidate(3, klass = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, color*/ 320) ;
    	};

    	return [
    		disabled,
    		labelToggle,
    		labelPlacement,
    		klass,
    		labelElement,
    		boxTap,
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

    		init(
    			this,
    			options,
    			instance$f,
    			create_fragment$f,
    			safe_not_equal,
    			{
    				checked: 6,
    				toggle: 7,
    				disabled: 0,
    				color: 8,
    				labelToggle: 1,
    				labelPlacement: 2,
    				class: 3
    			},
    			add_css$b
    		);
    	}
    }

    /* core\icon.svelte generated by Svelte v3.44.2 */

    function add_css$a(target) {
    	append_styles(target, "svelte-1a7tse5", "doric-icon.svelte-1a7tse5{font-size:var(--icon-font-size)}");
    }

    function create_fragment$e(ctx) {
    	let doric_icon;
    	let doric_icon_class_value;
    	let vars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			doric_icon = element("doric-icon");
    			set_custom_element_data(doric_icon, "class", doric_icon_class_value = "bi-" + /*name*/ ctx[0] + " svelte-1a7tse5");
    		},
    		m(target, anchor) {
    			insert(target, doric_icon, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_icon, /*iconVars*/ ctx[1]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && doric_icon_class_value !== (doric_icon_class_value = "bi-" + /*name*/ ctx[0] + " svelte-1a7tse5")) {
    				set_custom_element_data(doric_icon, "class", doric_icon_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*iconVars*/ 2) vars_action.update.call(null, /*iconVars*/ ctx[1]);
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

    function instance$e($$self, $$props, $$invalidate) {
    	let iconVars;
    	let { name } = $$props;
    	let { size } = $$props;

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('size' in $$props) $$invalidate(2, size = $$props.size);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 4) {
    			$$invalidate(1, iconVars = { "icon-font-size": size });
    		}
    	};

    	return [name, iconVars, size];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { name: 0, size: 2 }, add_css$a);
    	}
    }

    /* core\checkbox.svelte generated by Svelte v3.44.2 */

    function add_css$9(target) {
    	append_styles(target, "svelte-gvpcp9", "checkbox-label.svelte-gvpcp9{display:flex;align-items:center}checkbox-check.svelte-gvpcp9{grid-area:symbol;align-self:center;justify-self:center}");
    }

    // (51:8) <Button round="40px" color={buttonColor} {disabled} fab>
    function create_default_slot_1$2(ctx) {
    	let icon_1;
    	let current;

    	icon_1 = new Icon({
    			props: {
    				name: /*icon*/ ctx[7],
    				size: "16px",
    				outlined: /*outlined*/ ctx[5]
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
    			if (dirty & /*icon*/ 128) icon_1_changes.name = /*icon*/ ctx[7];
    			if (dirty & /*outlined*/ 32) icon_1_changes.outlined = /*outlined*/ ctx[5];
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

    // (49:0) <ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement} {labelToggle}>
    function create_default_slot$4(ctx) {
    	let checkbox_check;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				round: "40px",
    				color: /*buttonColor*/ ctx[6],
    				disabled: /*disabled*/ ctx[1],
    				fab: true,
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			checkbox_check = element("checkbox-check");
    			create_component(button.$$.fragment);
    			set_custom_element_data(checkbox_check, "class", "svelte-gvpcp9");
    		},
    		m(target, anchor) {
    			insert(target, checkbox_check, anchor);
    			mount_component(button, checkbox_check, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*buttonColor*/ 64) button_changes.color = /*buttonColor*/ ctx[6];
    			if (dirty & /*disabled*/ 2) button_changes.disabled = /*disabled*/ ctx[1];

    			if (dirty & /*$$scope, icon, outlined*/ 16544) {
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
    		}
    	};
    }

    // (55:4) 
    function create_label_slot$1(ctx) {
    	let checkbox_label;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

    	return {
    		c() {
    			checkbox_label = element("checkbox-label");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(checkbox_label, "slot", "label");
    			set_custom_element_data(checkbox_label, "class", "svelte-gvpcp9");
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

    function create_fragment$d(ctx) {
    	let togglebase;
    	let current;

    	togglebase = new Base({
    			props: {
    				checked: /*checked*/ ctx[0],
    				disabled: /*disabled*/ ctx[1],
    				toggle: /*toggle*/ ctx[8],
    				color: /*color*/ ctx[2],
    				labelPlacement: /*labelPlacement*/ ctx[3],
    				labelToggle: /*labelToggle*/ ctx[4],
    				$$slots: {
    					label: [create_label_slot$1],
    					default: [create_default_slot$4]
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
    			if (dirty & /*labelToggle*/ 16) togglebase_changes.labelToggle = /*labelToggle*/ ctx[4];

    			if (dirty & /*$$scope, buttonColor, disabled, icon, outlined*/ 16610) {
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

    function instance$d($$self, $$props, $$invalidate) {
    	let icon;
    	let buttonColor;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { group = [] } = $$props;
    	let { value } = $$props;
    	let { checked = group.indexOf(value) !== -1 } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { labelPlacement } = $$props;
    	let { labelToggle = true } = $$props;
    	let { checkedIcon = "check-square" } = $$props;
    	let { uncheckedIcon = "square" } = $$props;
    	let { outlined } = $$props;
    	const toggle = () => $$invalidate(0, checked = !checked);

    	const updateGroup = checked => {
    		if (checked === false) {
    			if (group.indexOf(value) !== -1) {
    				$$invalidate(9, group = group.filter(v => v !== value));
    			}

    			return;
    		}

    		if (group.indexOf(value) === -1) {
    			$$invalidate(9, group = [...group, value].sort());
    		}
    	};

    	$$self.$$set = $$props => {
    		if ('group' in $$props) $$invalidate(9, group = $$props.group);
    		if ('value' in $$props) $$invalidate(10, value = $$props.value);
    		if ('checked' in $$props) $$invalidate(0, checked = $$props.checked);
    		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('labelPlacement' in $$props) $$invalidate(3, labelPlacement = $$props.labelPlacement);
    		if ('labelToggle' in $$props) $$invalidate(4, labelToggle = $$props.labelToggle);
    		if ('checkedIcon' in $$props) $$invalidate(11, checkedIcon = $$props.checkedIcon);
    		if ('uncheckedIcon' in $$props) $$invalidate(12, uncheckedIcon = $$props.uncheckedIcon);
    		if ('outlined' in $$props) $$invalidate(5, outlined = $$props.outlined);
    		if ('$$scope' in $$props) $$invalidate(14, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, checkedIcon, uncheckedIcon*/ 6145) {
    			$$invalidate(7, icon = checked ? checkedIcon : uncheckedIcon);
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
    		labelToggle,
    		outlined,
    		buttonColor,
    		icon,
    		toggle,
    		group,
    		value,
    		checkedIcon,
    		uncheckedIcon,
    		slots,
    		$$scope
    	];
    }

    class Checkbox extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$d,
    			create_fragment$d,
    			safe_not_equal,
    			{
    				group: 9,
    				value: 10,
    				checked: 0,
    				disabled: 1,
    				color: 2,
    				labelPlacement: 3,
    				labelToggle: 4,
    				checkedIcon: 11,
    				uncheckedIcon: 12,
    				outlined: 5
    			},
    			add_css$9
    		);
    	}
    }

    /* core\control.svelte generated by Svelte v3.44.2 */

    function add_css$8(target) {
    	append_styles(target, "svelte-1t9ww3w", "control-component.svelte-1t9ww3w.svelte-1t9ww3w{display:inline-grid;position:relative;overflow:visible;z-index:0;grid-template-rows:max-content auto}control-content.svelte-1t9ww3w.svelte-1t9ww3w{position:relative;display:grid;grid-template-columns:max-content auto max-content;grid-template-areas:\"start-adornment control end-adornment\"\r\n        ;padding:13px 4px 4px 4px}fieldset.svelte-1t9ww3w.svelte-1t9ww3w{position:absolute;top:0px;left:0px;right:0px;bottom:0px;z-index:-1}.normal.svelte-1t9ww3w fieldset.svelte-1t9ww3w{border-radius:0px;border-width:0px;border-bottom:2px solid var(--control-border)}.outline.svelte-1t9ww3w fieldset.svelte-1t9ww3w{border:1px solid var(--control-border);border-radius:4px}.flat.svelte-1t9ww3w fieldset.svelte-1t9ww3w{border-width:0px}legend.svelte-1t9ww3w.svelte-1t9ww3w{font-size:12px;height:13px;color:var(--control-border)}legend.svelte-1t9ww3w.svelte-1t9ww3w:empty{padding:0px}fieldset.error.svelte-1t9ww3w.svelte-1t9ww3w{border-color:var(--control-border-error)}control-content.svelte-1t9ww3w>*:focus ~ fieldset:not(.error){border-color:var(--control-border-focus)}control-content.svelte-1t9ww3w>*:focus ~ fieldset > legend{color:var(--control-border-focus)}info-label.svelte-1t9ww3w.svelte-1t9ww3w{font-size:13px;padding-left:12px}info-label.error.svelte-1t9ww3w.svelte-1t9ww3w{color:var(--control-border-error)}");
    }

    function create_fragment$c(ctx) {
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
    			attr(legend, "class", "svelte-1t9ww3w");
    			attr(fieldset, "style", /*borderStyle*/ ctx[6]);
    			attr(fieldset, "class", "svelte-1t9ww3w");
    			toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			set_custom_element_data(control_content, "class", "svelte-1t9ww3w");
    			set_custom_element_data(info_label0, "class", "svelte-1t9ww3w");
    			set_custom_element_data(info_label1, "class", "error svelte-1t9ww3w");
    			set_custom_element_data(control_component, "style", /*style*/ ctx[4]);
    			set_custom_element_data(control_component, "class", control_component_class_value = "" + (/*variant*/ ctx[3] + " " + /*klass*/ ctx[7] + " svelte-1t9ww3w"));
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

    			if (!current || dirty & /*variant, klass*/ 136 && control_component_class_value !== (control_component_class_value = "" + (/*variant*/ ctx[3] + " " + /*klass*/ ctx[7] + " svelte-1t9ww3w"))) {
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

    function instance$c($$self, $$props, $$invalidate) {
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
    		if ('error' in $$props) $$invalidate(0, error = $$props.error);
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('info' in $$props) $$invalidate(2, info = $$props.info);
    		if ('variant' in $$props) $$invalidate(3, variant = $$props.variant);
    		if ('style' in $$props) $$invalidate(4, style = $$props.style);
    		if ('labelStyle' in $$props) $$invalidate(5, labelStyle = $$props.labelStyle);
    		if ('borderStyle' in $$props) $$invalidate(6, borderStyle = $$props.borderStyle);
    		if ('klass' in $$props) $$invalidate(7, klass = $$props.klass);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
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

    		init(
    			this,
    			options,
    			instance$c,
    			create_fragment$c,
    			safe_not_equal,
    			{
    				error: 0,
    				label: 1,
    				info: 2,
    				variant: 3,
    				style: 4,
    				labelStyle: 5,
    				borderStyle: 6,
    				klass: 7
    			},
    			add_css$8
    		);
    	}
    }

    /* core\portal.svelte generated by Svelte v3.44.2 */

    let portalRoot = null;

    if (typeof document !== "undefined") {
    	portalRoot = document.createElement("portal-root");
    	document.body.appendChild(portalRoot);
    }

    /* core\footer.svelte generated by Svelte v3.44.2 */

    function add_css$7(target) {
    	append_styles(target, "svelte-1gk6rqr", "doric-footer.svelte-1gk6rqr{display:grid;grid-template-columns:max-content auto max-content;box-shadow:0px -2px 4px rgba(0, 0, 0, 0.25);height:56px;position:fixed;z-index:+50;bottom:0px;left:50%;transform:translate(-50%);width:inherit;background-color:var(--card-background)}footer-area.svelte-1gk6rqr{display:grid}");
    }

    const get_right_slot_changes = dirty => ({});
    const get_right_slot_context = ctx => ({});
    const get_middle_slot_changes = dirty => ({});
    const get_middle_slot_context = ctx => ({});
    const get_left_slot_changes = dirty => ({});
    const get_left_slot_context = ctx => ({});

    function create_fragment$b(ctx) {
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
    	const left_slot_template = /*#slots*/ ctx[3].left;
    	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[2], get_left_slot_context);
    	const middle_slot_template = /*#slots*/ ctx[3].middle;
    	const middle_slot = create_slot(middle_slot_template, ctx, /*$$scope*/ ctx[2], get_middle_slot_context);
    	const right_slot_template = /*#slots*/ ctx[3].right;
    	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[2], get_right_slot_context);

    	return {
    		c() {
    			doric_footer = element("doric-footer");
    			footer_area0 = element("footer-area");
    			if (left_slot) left_slot.c();
    			t0 = space();
    			footer_area1 = element("footer-area");
    			if (middle_slot) middle_slot.c();
    			t1 = space();
    			footer_area2 = element("footer-area");
    			if (right_slot) right_slot.c();
    			set_custom_element_data(footer_area0, "class", "svelte-1gk6rqr");
    			set_custom_element_data(footer_area1, "class", "svelte-1gk6rqr");
    			set_custom_element_data(footer_area2, "class", "svelte-1gk6rqr");
    			set_custom_element_data(doric_footer, "class", "svelte-1gk6rqr");
    		},
    		m(target, anchor) {
    			insert(target, doric_footer, anchor);
    			append(doric_footer, footer_area0);

    			if (left_slot) {
    				left_slot.m(footer_area0, null);
    			}

    			append(doric_footer, t0);
    			append(doric_footer, footer_area1);

    			if (middle_slot) {
    				middle_slot.m(footer_area1, null);
    			}

    			append(doric_footer, t1);
    			append(doric_footer, footer_area2);

    			if (right_slot) {
    				right_slot.m(footer_area2, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_footer, /*variables*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (left_slot) {
    				if (left_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						left_slot,
    						left_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(left_slot_template, /*$$scope*/ ctx[2], dirty, get_left_slot_changes),
    						get_left_slot_context
    					);
    				}
    			}

    			if (middle_slot) {
    				if (middle_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						middle_slot,
    						middle_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(middle_slot_template, /*$$scope*/ ctx[2], dirty, get_middle_slot_changes),
    						get_middle_slot_context
    					);
    				}
    			}

    			if (right_slot) {
    				if (right_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						right_slot,
    						right_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(right_slot_template, /*$$scope*/ ctx[2], dirty, get_right_slot_changes),
    						get_right_slot_context
    					);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*variables*/ 1) vars_action.update.call(null, /*variables*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(left_slot, local);
    			transition_in(middle_slot, local);
    			transition_in(right_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(left_slot, local);
    			transition_out(middle_slot, local);
    			transition_out(right_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_footer);
    			if (left_slot) left_slot.d(detaching);
    			if (middle_slot) middle_slot.d(detaching);
    			if (right_slot) right_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let variables;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { width = "100%" } = $$props;

    	$$self.$$set = $$props => {
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width*/ 2) {
    			$$invalidate(0, variables = { width });
    		}
    	};

    	return [variables, width, $$scope, slots];
    }

    class Footer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { width: 1 }, add_css$7);
    	}
    }

    /* core\paper.svelte generated by Svelte v3.44.2 */

    function add_css$6(target) {
    	append_styles(target, "svelte-1vp5zac", "doric-paper.svelte-1vp5zac{display:block;border-radius:4px;border-style:solid;border-width:0px;box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25);overflow:hidden;width:var(--width);background-color:var(--card-background);border-color:var(--border-color, var(--layer-border-color))}doric-paper.square.svelte-1vp5zac{border-radius:0px}doric-paper.center.svelte-1vp5zac{margin:auto}doric-paper.footer.svelte-1vp5zac{padding-bottom:56px}doric-paper.border.svelte-1vp5zac{border-width:var(--layer-border-width)}");
    }

    function create_fragment$a(ctx) {
    	let doric_paper;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			doric_paper = element("doric-paper");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_paper, "class", "svelte-1vp5zac");
    			toggle_class(doric_paper, "center", /*center*/ ctx[0]);
    			toggle_class(doric_paper, "footer", /*footer*/ ctx[1]);
    			toggle_class(doric_paper, "square", /*square*/ ctx[2]);
    			toggle_class(doric_paper, "border", /*border*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, doric_paper, anchor);

    			if (default_slot) {
    				default_slot.m(doric_paper, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_paper, /*variables*/ ctx[4]));
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

    			if (vars_action && is_function(vars_action.update) && dirty & /*variables*/ 16) vars_action.update.call(null, /*variables*/ ctx[4]);

    			if (dirty & /*center*/ 1) {
    				toggle_class(doric_paper, "center", /*center*/ ctx[0]);
    			}

    			if (dirty & /*footer*/ 2) {
    				toggle_class(doric_paper, "footer", /*footer*/ ctx[1]);
    			}

    			if (dirty & /*square*/ 4) {
    				toggle_class(doric_paper, "square", /*square*/ ctx[2]);
    			}

    			if (dirty & /*border*/ 8) {
    				toggle_class(doric_paper, "border", /*border*/ ctx[3]);
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
    			if (detaching) detach(doric_paper);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let variables;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { center } = $$props;
    	let { width } = $$props;
    	let { footer } = $$props;
    	let { square } = $$props;
    	let { border } = $$props;

    	$$self.$$set = $$props => {
    		if ('center' in $$props) $$invalidate(0, center = $$props.center);
    		if ('width' in $$props) $$invalidate(5, width = $$props.width);
    		if ('footer' in $$props) $$invalidate(1, footer = $$props.footer);
    		if ('square' in $$props) $$invalidate(2, square = $$props.square);
    		if ('border' in $$props) $$invalidate(3, border = $$props.border);
    		if ('$$scope' in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width*/ 32) {
    			$$invalidate(4, variables = { width });
    		}
    	};

    	return [center, footer, square, border, variables, width, $$scope, slots];
    }

    class Paper extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				center: 0,
    				width: 5,
    				footer: 1,
    				square: 2,
    				border: 3
    			},
    			add_css$6
    		);
    	}
    }

    /* core\switch.svelte generated by Svelte v3.44.2 */

    function add_css$5(target) {
    	append_styles(target, "svelte-27degi", "switch-label.svelte-27degi{display:flex;align-items:center}switch-toggle.svelte-27degi{grid-area:symbol;align-self:center;justify-self:center}switch-wrapper.svelte-27degi{display:block;position:relative;height:36px;width:48px}switch-track.svelte-27degi{position:absolute;top:50%;left:0px;width:100%;height:28px;border-radius:18px;background-color:var(--text-normal);opacity:0.32;transform:translateY(-50%);transition:background-color 100ms linear, opacity 100ms linear}switch-thumb.svelte-27degi{position:absolute;top:50%;left:0px;width:16px;height:16px;border-radius:18px;background-color:#e0e0e0;transform:translate(8px, -50%);transition:transform 100ms linear}switch-thumb.checked.svelte-27degi{transform:translate(26px, -50%)}switch-track.checked.svelte-27degi:not(.default){background-color:var(--button-color);opacity:0.75}");
    }

    // (82:8) <Button round="48px" color={buttonColor} {disabled}>
    function create_default_slot_1$1(ctx) {
    	let switch_wrapper;
    	let switch_track;
    	let switch_track_class_value;
    	let t;
    	let switch_thumb;

    	return {
    		c() {
    			switch_wrapper = element("switch-wrapper");
    			switch_track = element("switch-track");
    			t = space();
    			switch_thumb = element("switch-thumb");
    			set_custom_element_data(switch_track, "class", switch_track_class_value = "" + (null_to_empty(/*color*/ ctx[2]) + " svelte-27degi"));
    			toggle_class(switch_track, "checked", /*checked*/ ctx[0]);
    			set_custom_element_data(switch_thumb, "class", "svelte-27degi");
    			toggle_class(switch_thumb, "checked", /*checked*/ ctx[0]);
    			set_custom_element_data(switch_wrapper, "class", "svelte-27degi");
    		},
    		m(target, anchor) {
    			insert(target, switch_wrapper, anchor);
    			append(switch_wrapper, switch_track);
    			append(switch_wrapper, t);
    			append(switch_wrapper, switch_thumb);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*color*/ 4 && switch_track_class_value !== (switch_track_class_value = "" + (null_to_empty(/*color*/ ctx[2]) + " svelte-27degi"))) {
    				set_custom_element_data(switch_track, "class", switch_track_class_value);
    			}

    			if (dirty & /*color, checked*/ 5) {
    				toggle_class(switch_track, "checked", /*checked*/ ctx[0]);
    			}

    			if (dirty & /*checked*/ 1) {
    				toggle_class(switch_thumb, "checked", /*checked*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(switch_wrapper);
    		}
    	};
    }

    // (80:0) <ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement}>
    function create_default_slot$3(ctx) {
    	let switch_toggle;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				round: "48px",
    				color: /*buttonColor*/ ctx[4],
    				disabled: /*disabled*/ ctx[1],
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			switch_toggle = element("switch-toggle");
    			create_component(button.$$.fragment);
    			set_custom_element_data(switch_toggle, "class", "svelte-27degi");
    		},
    		m(target, anchor) {
    			insert(target, switch_toggle, anchor);
    			mount_component(button, switch_toggle, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*buttonColor*/ 16) button_changes.color = /*buttonColor*/ ctx[4];
    			if (dirty & /*disabled*/ 2) button_changes.disabled = /*disabled*/ ctx[1];

    			if (dirty & /*$$scope, checked, color*/ 517) {
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
    			if (detaching) detach(switch_toggle);
    			destroy_component(button);
    		}
    	};
    }

    // (89:4) 
    function create_label_slot(ctx) {
    	let switch_label;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			switch_label = element("switch-label");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(switch_label, "slot", "label");
    			set_custom_element_data(switch_label, "class", "svelte-27degi");
    		},
    		m(target, anchor) {
    			insert(target, switch_label, anchor);

    			if (default_slot) {
    				default_slot.m(switch_label, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
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
    			if (detaching) detach(switch_label);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let togglebase;
    	let current;

    	togglebase = new Base({
    			props: {
    				checked: /*checked*/ ctx[0],
    				disabled: /*disabled*/ ctx[1],
    				toggle: /*toggle*/ ctx[5],
    				color: /*color*/ ctx[2],
    				labelPlacement: /*labelPlacement*/ ctx[3],
    				$$slots: {
    					label: [create_label_slot],
    					default: [create_default_slot$3]
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

    			if (dirty & /*$$scope, buttonColor, disabled, checked, color*/ 535) {
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

    function instance$9($$self, $$props, $$invalidate) {
    	let buttonColor;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { group = [] } = $$props;
    	let { value } = $$props;
    	let { checked = group.indexOf(value) !== -1 } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { labelPlacement } = $$props;
    	const toggle = () => $$invalidate(0, checked = !checked);

    	const updateGroup = checked => {
    		if (checked === false) {
    			if (group.indexOf(value) !== -1) {
    				$$invalidate(6, group = group.filter(v => v !== value));
    			}

    			return;
    		}

    		if (group.indexOf(value) === -1) {
    			$$invalidate(6, group = [...group, value]);
    		}
    	};

    	$$self.$$set = $$props => {
    		if ('group' in $$props) $$invalidate(6, group = $$props.group);
    		if ('value' in $$props) $$invalidate(7, value = $$props.value);
    		if ('checked' in $$props) $$invalidate(0, checked = $$props.checked);
    		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('labelPlacement' in $$props) $$invalidate(3, labelPlacement = $$props.labelPlacement);
    		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked*/ 1) {
    			updateGroup(checked);
    		}

    		if ($$self.$$.dirty & /*checked, color*/ 5) {
    			$$invalidate(4, buttonColor = checked ? color : "default");
    		}
    	};

    	return [
    		checked,
    		disabled,
    		color,
    		labelPlacement,
    		buttonColor,
    		toggle,
    		group,
    		value,
    		slots,
    		$$scope
    	];
    }

    class Switch extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$9,
    			create_fragment$9,
    			safe_not_equal,
    			{
    				group: 6,
    				value: 7,
    				checked: 0,
    				disabled: 1,
    				color: 2,
    				labelPlacement: 3
    			},
    			add_css$5
    		);
    	}
    }

    /* core\tabs.svelte generated by Svelte v3.44.2 */

    function add_css$4(target) {
    	append_styles(target, "svelte-x5vfy4", "doric-tabs.svelte-x5vfy4.svelte-x5vfy4{display:grid;grid-template-columns:repeat(var(--tabs), 1fr);background-color:var(--card-background);color:var(--text-normal)}doric-tabs.vertical.svelte-x5vfy4.svelte-x5vfy4{grid-template-columns:1fr;grid-template-rows:repeat(var(--tabs), 1fr)}tab-item.svelte-x5vfy4.svelte-x5vfy4{display:grid;border-width:0px;border-bottom-width:2px;border-style:solid;border-color:transparent}tab-item.selected.svelte-x5vfy4.svelte-x5vfy4{color:var(--primary);border-color:var(--primary)}.vertical.svelte-x5vfy4 tab-item.svelte-x5vfy4{border-bottom-width:0px;border-right-width:2px}tab-label.svelte-x5vfy4.svelte-x5vfy4{display:flex;align-items:center;justify-content:center;padding:8px 12px;font-size:var(--text-sixe-header)}tab-label.vertical.svelte-x5vfy4.svelte-x5vfy4{flex-direction:column}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (64:20) {#if option.icon}
    function create_if_block(ctx) {
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
    function create_default_slot$2(ctx) {
    	let tab_label;
    	let t0;
    	let span;
    	let t1_value = /*option*/ ctx[6].label + "";
    	let t1;
    	let current;
    	let if_block = /*option*/ ctx[6].icon && create_if_block(ctx);

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

    function create_fragment$8(ctx) {
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
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, doric_tabs, outro_and_destroy_block, create_each_block, null, get_each_context);
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

    function instance$8($$self, $$props, $$invalidate) {
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
    			instance$8,
    			create_fragment$8,
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

    /* core\text.svelte generated by Svelte v3.44.2 */

    function add_css$3(target) {
    	append_styles(target, "svelte-mvif72", ".block.svelte-mvif72{display:block}.title.svelte-mvif72{display:block;font-size:var(--text-size-title);font-weight:400;margin:8px 0px}.header.svelte-mvif72{display:block;font-size:var(--text-size-header);font-weight:400;margin:4px 0px}.variant-secondary.svelte-mvif72{font-size:var(--text-size-secondary)}.primary.svelte-mvif72{color:var(--primary)}.secondary.svelte-mvif72{color:var(--secondary)}.danger.svelte-mvif72{color:var(--danger)}.left.svelte-mvif72{text-align:left}.right.svelte-mvif72{text-align:right}.center.svelte-mvif72{text-align:center}.adorn.svelte-mvif72{display:flex;align-items:center;justify-content:center}");
    }

    function create_fragment$7(ctx) {
    	let span;
    	let span_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	return {
    		c() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr(span, "class", span_class_value = "" + (/*variantClass*/ ctx[5] + " " + /*color*/ ctx[3] + " " + /*klass*/ ctx[4] + " " + /*align*/ ctx[1] + " svelte-mvif72"));
    			toggle_class(span, "block", /*block*/ ctx[0]);
    			toggle_class(span, "adorn", /*adorn*/ ctx[2]);
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

    			if (!current || dirty & /*variantClass, color, klass, align*/ 58 && span_class_value !== (span_class_value = "" + (/*variantClass*/ ctx[5] + " " + /*color*/ ctx[3] + " " + /*klass*/ ctx[4] + " " + /*align*/ ctx[1] + " svelte-mvif72"))) {
    				attr(span, "class", span_class_value);
    			}

    			if (dirty & /*variantClass, color, klass, align, block*/ 59) {
    				toggle_class(span, "block", /*block*/ ctx[0]);
    			}

    			if (dirty & /*variantClass, color, klass, align, adorn*/ 62) {
    				toggle_class(span, "adorn", /*adorn*/ ctx[2]);
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

    function instance$7($$self, $$props, $$invalidate) {
    	let variantClass;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { variant = "" } = $$props;
    	let { block = false } = $$props;
    	let { align = "left" } = $$props;
    	let { adorn } = $$props;
    	let { color } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ('variant' in $$props) $$invalidate(6, variant = $$props.variant);
    		if ('block' in $$props) $$invalidate(0, block = $$props.block);
    		if ('align' in $$props) $$invalidate(1, align = $$props.align);
    		if ('adorn' in $$props) $$invalidate(2, adorn = $$props.adorn);
    		if ('color' in $$props) $$invalidate(3, color = $$props.color);
    		if ('class' in $$props) $$invalidate(4, klass = $$props.class);
    		if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*variant*/ 64) {
    			$$invalidate(5, variantClass = variant ? `variant-${variant}` : "");
    		}
    	};

    	return [block, align, adorn, color, klass, variantClass, variant, $$scope, slots];
    }

    class Text extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$7,
    			create_fragment$7,
    			safe_not_equal,
    			{
    				variant: 6,
    				block: 0,
    				align: 1,
    				adorn: 2,
    				color: 3,
    				class: 4
    			},
    			add_css$3
    		);
    	}
    }

    /* core\text-input.svelte generated by Svelte v3.44.2 */

    function add_css$2(target) {
    	append_styles(target, "svelte-1tyb9cz", "input.svelte-1tyb9cz{font-family:var(--font);font-size:var(--text-size);grid-area:control;height:36px;box-sizing:border-box;padding:8px 4px;border-width:0px;background-color:transparent;color:var(--text-normal);min-width:24px}input.svelte-1tyb9cz:focus{outline:none}");
    }

    // (53:0) <Control type="text-input" {...controlProps}>
    function create_default_slot$1(ctx) {
    	let input;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let input_levels = [/*inputProps*/ ctx[2]];
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
    			if (input.autofocus) input.focus();
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
    			set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*inputProps*/ 4 && /*inputProps*/ ctx[2]]));

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			toggle_class(input, "svelte-1tyb9cz", true);

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 131072)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[17],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[17])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[17], dirty, null),
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
    			if (detaching) detach(input);
    			/*input_binding*/ ctx[15](null);
    			if (detaching) detach(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let control;
    	let current;
    	const control_spread_levels = [{ type: "text-input" }, /*controlProps*/ ctx[3]];

    	let control_props = {
    		$$slots: { default: [create_default_slot$1] },
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
    			const control_changes = (dirty & /*controlProps*/ 8)
    			? get_spread_update(control_spread_levels, [control_spread_levels[0], get_spread_object(/*controlProps*/ ctx[3])])
    			: {};

    			if (dirty & /*$$scope, inputProps, inputElement, value*/ 131079) {
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

    function instance$6($$self, $$props, $$invalidate) {
    	let controlProps;
    	let inputProps;
    	const omit_props_names = ["label","error","info","variant","class","value","disabled","type","focus"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = "" } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant = "outline" } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { type = "text" } = $$props;
    	let inputElement = null;

    	function focus() {
    		inputElement.focus();
    	}

    	function focus_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function blur_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
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
    		if ('label' in $$new_props) $$invalidate(4, label = $$new_props.label);
    		if ('error' in $$new_props) $$invalidate(5, error = $$new_props.error);
    		if ('info' in $$new_props) $$invalidate(6, info = $$new_props.info);
    		if ('variant' in $$new_props) $$invalidate(7, variant = $$new_props.variant);
    		if ('class' in $$new_props) $$invalidate(8, klass = $$new_props.class);
    		if ('value' in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ('disabled' in $$new_props) $$invalidate(9, disabled = $$new_props.disabled);
    		if ('type' in $$new_props) $$invalidate(10, type = $$new_props.type);
    		if ('$$scope' in $$new_props) $$invalidate(17, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, variant, disabled, klass*/ 1008) {
    			$$invalidate(3, controlProps = {
    				label,
    				info,
    				error,
    				variant,
    				disabled,
    				klass
    			});
    		}

    		$$invalidate(2, inputProps = { type, disabled, ...$$restProps });
    	};

    	return [
    		value,
    		inputElement,
    		inputProps,
    		controlProps,
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

    		init(
    			this,
    			options,
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				label: 4,
    				error: 5,
    				info: 6,
    				variant: 7,
    				class: 8,
    				value: 0,
    				disabled: 9,
    				type: 10,
    				focus: 11
    			},
    			add_css$2
    		);
    	}

    	get focus() {
    		return this.$$.ctx[11];
    	}
    }

    /* core\title-bar.svelte generated by Svelte v3.44.2 */

    function add_css$1(target) {
    	append_styles(target, "svelte-1itjgja", "doric-title-bar.svelte-1itjgja.svelte-1itjgja{position:relative;z-index:+0;grid-template-rows:56px min-content;background-color:var(--title-bar-background);color:var(--title-bar-text);display:grid;grid-template-columns:max-content auto max-content;grid-template-areas:\"menu-adornment title action-adornment\"\r\n            \"extension-adornment extension-adornment extension-adornment\"\r\n        ;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25)}doric-title-bar.svelte-1itjgja doric-adornment > *:not([ignore-titlebar-reskin]){--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark);--control-border:var(--title-bar-text);--control-border-focus:var(--title-bar-text)}doric-title-bar.sticky.svelte-1itjgja.svelte-1itjgja{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.svelte-1itjgja>title-text.svelte-1itjgja{grid-area:title;font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}doric-title-bar.center.svelte-1itjgja>title-text.svelte-1itjgja{justify-content:center}");
    }

    const get_adornments_slot_changes = dirty => ({});
    const get_adornments_slot_context = ctx => ({});

    function create_fragment$5(ctx) {
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
    			set_custom_element_data(title_text, "class", "svelte-1itjgja");
    			set_custom_element_data(doric_title_bar, "class", "svelte-1itjgja");
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

    			if (adornments_slot) {
    				if (adornments_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						adornments_slot,
    						adornments_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(adornments_slot_template, /*$$scope*/ ctx[2], dirty, get_adornments_slot_changes),
    						get_adornments_slot_context
    					);
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

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { center } = $$props;

    	$$self.$$set = $$props => {
    		if ('sticky' in $$props) $$invalidate(0, sticky = $$props.sticky);
    		if ('center' in $$props) $$invalidate(1, center = $$props.center);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [sticky, center, $$scope, slots];
    }

    class Title_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { sticky: 0, center: 1 }, add_css$1);
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

    /* core\theme\light.svelte generated by Svelte v3.44.2 */

    function create_fragment$4(ctx) {
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

    function instance$4($$self) {
    	const theme = css`
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.44.2 */

    function create_fragment$3(ctx) {
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

    function instance$3($$self) {
    	const theme = css`
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* core\theme\tron.svelte generated by Svelte v3.44.2 */

    function create_fragment$2(ctx) {
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

    function instance$2($$self) {
    	const theme = css`
        body {
            --font: Orbitron;
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* core\layout\flex.svelte generated by Svelte v3.44.2 */

    function add_css(target) {
    	append_styles(target, "svelte-epra6s", "flex-layout.svelte-epra6s{display:flex;flex-wrap:wrap;flex-direction:var(--direction);padding:var(--padding);gap:var(--gap)}flex-layout.item-fill.svelte-epra6s>*{flex-grow:1}flex-layout.svelte-epra6s>flex-break,flex-layout.item-fill.svelte-epra6s>flex-break{flex-basis:100%;height:0;width:0}");
    }

    function create_fragment$1(ctx) {
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
    			set_custom_element_data(flex_layout, "class", "svelte-epra6s");
    			toggle_class(flex_layout, "item-fill", /*itemFill*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, flex_layout, anchor);

    			if (default_slot) {
    				default_slot.m(flex_layout, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, flex_layout, /*flexVars*/ ctx[1]));
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

    function instance$1($$self, $$props, $$invalidate) {
    	let flexVars;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { direction = "row" } = $$props;
    	let { padding = "8px" } = $$props;
    	let { gap = "2px" } = $$props;
    	let { itemFill = false } = $$props;

    	$$self.$$set = $$props => {
    		if ('direction' in $$props) $$invalidate(2, direction = $$props.direction);
    		if ('padding' in $$props) $$invalidate(3, padding = $$props.padding);
    		if ('gap' in $$props) $$invalidate(4, gap = $$props.gap);
    		if ('itemFill' in $$props) $$invalidate(0, itemFill = $$props.itemFill);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
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

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				direction: 2,
    				padding: 3,
    				gap: 4,
    				itemFill: 0
    			},
    			add_css
    		);
    	}
    }

    /* demo\src\app.svelte generated by Svelte v3.44.2 */

    function create_default_slot_11(ctx) {
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

    // (51:16) <Button>
    function create_default_slot_10(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { name: "box-arrow-right", size: "16px" }
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

    // (50:12) <Adornment position="action">
    function create_default_slot_9(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_10] },
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

    			if (dirty & /*$$scope*/ 256) {
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

    // (49:8) <svelte:fragment slot="adornments">
    function create_adornments_slot(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "action",
    				$$slots: { default: [create_default_slot_9] },
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

    			if (dirty & /*$$scope*/ 256) {
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

    // (59:8) <Text>
    function create_default_slot_8(ctx) {
    	let i;
    	let t;
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "alarm" } });

    	return {
    		c() {
    			i = element("i");
    			t = space();
    			create_component(icon.$$.fragment);
    			attr(i, "class", "bi-alarm");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    			insert(target, t, anchor);
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
    			if (detaching) detach(i);
    			if (detaching) detach(t);
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (64:8) <Button on:tap={console.log}>
    function create_default_slot_7(ctx) {
    	let icon;
    	let t;
    	let current;
    	icon = new Icon({ props: { name: "wifi" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    			t = text("\r\n            Test");
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

    // (73:8) <Checkbox bind:checked>
    function create_default_slot_6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Active");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (77:8) <Switch bind:checked>
    function create_default_slot_5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("More Active");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (83:16) <Text adorn>
    function create_default_slot_4(ctx) {
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

    // (82:12) <Adornment position="start">
    function create_default_slot_3(ctx) {
    	let text_1;
    	let current;

    	text_1 = new Text({
    			props: {
    				adorn: true,
    				$$slots: { default: [create_default_slot_4] },
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

    			if (dirty & /*$$scope*/ 256) {
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

    // (81:8) <TextInput label="Cost">
    function create_default_slot_2(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_3] },
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

    			if (dirty & /*$$scope*/ 256) {
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

    // (58:4) <Flex direction="column">
    function create_default_slot_1(ctx) {
    	let text_1;
    	let t0;
    	let button;
    	let t1;
    	let checkbox;
    	let updating_checked;
    	let t2;
    	let switch_1;
    	let updating_checked_1;
    	let t3;
    	let textinput;
    	let current;

    	text_1 = new Text({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", console.log);

    	function checkbox_checked_binding(value) {
    		/*checkbox_checked_binding*/ ctx[4](value);
    	}

    	let checkbox_props = {
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	};

    	if (/*checked*/ ctx[1] !== void 0) {
    		checkbox_props.checked = /*checked*/ ctx[1];
    	}

    	checkbox = new Checkbox({ props: checkbox_props });
    	binding_callbacks.push(() => bind(checkbox, 'checked', checkbox_checked_binding));

    	function switch_1_checked_binding(value) {
    		/*switch_1_checked_binding*/ ctx[5](value);
    	}

    	let switch_1_props = {
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	};

    	if (/*checked*/ ctx[1] !== void 0) {
    		switch_1_props.checked = /*checked*/ ctx[1];
    	}

    	switch_1 = new Switch({ props: switch_1_props });
    	binding_callbacks.push(() => bind(switch_1, 'checked', switch_1_checked_binding));

    	textinput = new Text_input({
    			props: {
    				label: "Cost",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(text_1.$$.fragment);
    			t0 = space();
    			create_component(button.$$.fragment);
    			t1 = space();
    			create_component(checkbox.$$.fragment);
    			t2 = space();
    			create_component(switch_1.$$.fragment);
    			t3 = space();
    			create_component(textinput.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(text_1, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(button, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(checkbox, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(switch_1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(textinput, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			const checkbox_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				checkbox_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked && dirty & /*checked*/ 2) {
    				updating_checked = true;
    				checkbox_changes.checked = /*checked*/ ctx[1];
    				add_flush_callback(() => updating_checked = false);
    			}

    			checkbox.$set(checkbox_changes);
    			const switch_1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				switch_1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_checked_1 && dirty & /*checked*/ 2) {
    				updating_checked_1 = true;
    				switch_1_changes.checked = /*checked*/ ctx[1];
    				add_flush_callback(() => updating_checked_1 = false);
    			}

    			switch_1.$set(switch_1_changes);
    			const textinput_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				textinput_changes.$$scope = { dirty, ctx };
    			}

    			textinput.$set(textinput_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			transition_in(checkbox.$$.fragment, local);
    			transition_in(switch_1.$$.fragment, local);
    			transition_in(textinput.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(checkbox.$$.fragment, local);
    			transition_out(switch_1.$$.fragment, local);
    			transition_out(textinput.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(text_1, detaching);
    			if (detaching) detach(t0);
    			destroy_component(button, detaching);
    			if (detaching) detach(t1);
    			destroy_component(checkbox, detaching);
    			if (detaching) detach(t2);
    			destroy_component(switch_1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(textinput, detaching);
    		}
    	};
    }

    // (89:8) <svelte:fragment slot="middle">
    function create_middle_slot(ctx) {
    	let tabs;
    	let updating_tabGroup;
    	let current;

    	function tabs_tabGroup_binding(value) {
    		/*tabs_tabGroup_binding*/ ctx[6](value);
    	}

    	let tabs_props = {
    		options: /*options*/ ctx[3],
    		iconTop: true
    	};

    	if (/*currentTheme*/ ctx[0] !== void 0) {
    		tabs_props.tabGroup = /*currentTheme*/ ctx[0];
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
    		p(ctx, dirty) {
    			const tabs_changes = {};

    			if (!updating_tabGroup && dirty & /*currentTheme*/ 1) {
    				updating_tabGroup = true;
    				tabs_changes.tabGroup = /*currentTheme*/ ctx[0];
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

    // (45:0) <Paper center footer square width="min(640px, 100%)">
    function create_default_slot(ctx) {
    	let titlebar;
    	let t0;
    	let flex;
    	let t1;
    	let footer;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				sticky: true,
    				$$slots: {
    					adornments: [create_adornments_slot],
    					default: [create_default_slot_11]
    				},
    				$$scope: { ctx }
    			}
    		});

    	flex = new Flex({
    			props: {
    				direction: "column",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	footer = new Footer({
    			props: {
    				$$slots: { middle: [create_middle_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    			t0 = space();
    			create_component(flex.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(flex, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const flex_changes = {};

    			if (dirty & /*$$scope, checked*/ 258) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    			const footer_changes = {};

    			if (dirty & /*$$scope, currentTheme*/ 257) {
    				footer_changes.$$scope = { dirty, ctx };
    			}

    			footer.$set(footer_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			transition_in(flex.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			transition_out(flex.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    			if (detaching) detach(t0);
    			destroy_component(flex, detaching);
    			if (detaching) detach(t1);
    			destroy_component(footer, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let appstyle;
    	let t;
    	let paper;
    	let current;

    	appstyle = new App_style({
    			props: { baseline: Baseline, theme: /*theme*/ ctx[2] }
    		});

    	paper = new Paper({
    			props: {
    				center: true,
    				footer: true,
    				square: true,
    				width: "min(640px, 100%)",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(appstyle.$$.fragment);
    			t = space();
    			create_component(paper.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appstyle, target, anchor);
    			insert(target, t, anchor);
    			mount_component(paper, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const appstyle_changes = {};
    			if (dirty & /*theme*/ 4) appstyle_changes.theme = /*theme*/ ctx[2];
    			appstyle.$set(appstyle_changes);
    			const paper_changes = {};

    			if (dirty & /*$$scope, currentTheme, checked*/ 259) {
    				paper_changes.$$scope = { dirty, ctx };
    			}

    			paper.$set(paper_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appstyle.$$.fragment, local);
    			transition_in(paper.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appstyle.$$.fragment, local);
    			transition_out(paper.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appstyle, detaching);
    			if (detaching) detach(t);
    			destroy_component(paper, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let theme;

    	const options = [
    		{
    			label: "Light Theme",
    			value: "light",
    			icon: "sun"
    		},
    		{
    			label: "Dark Theme",
    			value: "dark",
    			icon: "moon"
    		},
    		{
    			label: "Tron Theme",
    			value: "tron",
    			icon: "laptop"
    		}
    	];

    	const themeMap = {
    		light: Light,
    		dark: Dark,
    		tron: Tron
    	};

    	let currentTheme = localStorage.theme ?? "light";
    	let checked = false;

    	function checkbox_checked_binding(value) {
    		checked = value;
    		$$invalidate(1, checked);
    	}

    	function switch_1_checked_binding(value) {
    		checked = value;
    		$$invalidate(1, checked);
    	}

    	function tabs_tabGroup_binding(value) {
    		currentTheme = value;
    		$$invalidate(0, currentTheme);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentTheme*/ 1) {
    			$$invalidate(2, theme = themeMap[currentTheme]);
    		}

    		if ($$self.$$.dirty & /*currentTheme*/ 1) {
    			localStorage.theme = currentTheme;
    		}
    	};

    	return [
    		currentTheme,
    		checked,
    		theme,
    		options,
    		checkbox_checked_binding,
    		switch_1_checked_binding,
    		tabs_tabGroup_binding
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    var main = new App({
        target: document.body,
    });

    return main;

}());
