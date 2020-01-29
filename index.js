module.exports = {
	wrap(object, property, newFnValue) {
		if (!object || !property || !newFnValue) {
			throw new TypeError('Parameters to wrapping function cannot be empty');
		}

		if (!object[property]) {
			throw new TypeError('Wrapping function cannot wrap an empty value');
		}

		if (typeof newFnValue !== 'function') {
			throw new TypeError('Wrapper has to be a function');
		}

		if (!object.__wrappers) {
			Object.defineProperty(object, '__wrappers', {
				value: {
					[property]: {
						fns: [newFnValue],
						original: object[property]
					}
				}
			});
		} else if (!object.__wrappers[property]) {
			object.__wrappers[property] = {
				fns: [newFnValue],
				original: object[property]
			};
		} else {
			// save fn value on the parent module/object __wrappers property
			object.__wrappers[property].fns.push(newFnValue);
		}

		object[property] = newFnValue;

		const wrappingFnNumber = object.__wrappers[property].fns.length;
		// return fn that will remove this specific wrapping fn (i.e. newFnValue) when called
		return () => this.unwrap(object, property, wrappingFnNumber);
	},
	// returns a fn that executes the next fn in the wrapper fns stack
	nextFn(object, property) {
		let numWrappers;

		if (!object || !property || !object[property]) {
			return;
		}

		if (!object.__wrappers || !object.__wrappers[property]) {
			numWrappers = 0;
		} else {
			numWrappers = object.__wrappers[property].fns.length;
		}

		return (obj, args) => {
			if (!object.__wrappers || !object.__wrappers[property]) {
				return;
			}
			// find the top/last non-null fn wrapper defined
			// (only looking down from fns defined at the time nextFn was called)
			const fn = object.__wrappers[property].fns
				.slice(0, numWrappers)
				.filter(f => f != null)
				.pop();

			return fn ? fn.apply(obj, args) : object.__wrappers[property].original.apply(obj, args);
		};
	},
	// removes a specific wrapping function from the wrappers fn stack
	unwrap(object, property, wrapperNumber) {
		if (!object || !property || !object[property]) {
			return;
		}

		if (!object.__wrappers || !object.__wrappers[property]) {
			return;
		}

		if (wrapperNumber == null || wrapperNumber > object.__wrappers[property].length) {
			return;
		}

		object.__wrappers[property].fns[wrapperNumber - 1] = null;

		// if all fns are empty, restore original module fn
		if (object.__wrappers[property].fns.every(e => e == null)) {
			object[property] = object.__wrappers[property].original;
			delete object.__wrappers[property];
		}
	}
};
