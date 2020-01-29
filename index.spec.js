const wrapper = require('./index');

describe('Module wrapper helper', () => {
	describe('wrap', () => {
		it('should throw an error if one of the parameters is empty', () => {
			const obj = { get: () => {} };
			expect(() => wrapper.wrap()).toThrow(TypeError);
			expect(() => wrapper.wrap(obj)).toThrow(TypeError);
			expect(() => wrapper.wrap(obj, 'get')).toThrow(TypeError);
		});

		it('should throw an error if trying to wrap an empty object field', () => {
			const obj = { get: null };
			expect(() => wrapper.wrap(obj, 'get', () => {})).toThrow(TypeError);
		});

		it('should throw an error if the passed wrapper is not a function', () => {
			const obj = { get: () => {} };
			expect(() => wrapper.wrap(obj, 'get', null)).toThrow(TypeError);
			expect(() => wrapper.wrap(obj, 'get', {})).toThrow(TypeError);
		});

		it('should define a __wrappers property on the parent object of the original function that holds the wrapping functions and the original function value', () => {
			const obj = { get: () => {} };
			wrapper.wrap(obj, 'get', () => {});
			expect(obj.__wrappers).toBeDefined();
			expect(obj.__wrappers.get).toBeDefined();
			expect(obj.__wrappers.get.fns).toBeDefined();
			expect(obj.__wrappers.get.original).toBeDefined();
		});

		it('should replace the value for object[property] with the new function', () => {
			const obj = { get: () => {} };
			const fn1 = () => {};
			wrapper.wrap(obj, 'get', fn1);

			expect(obj.get).toEqual(fn1);
		});

		it('calling the function should call both the original method and the wrapper code (when wrapper code calls the next function)', () => {
			const obj = { get: () => {} };
			const originalFn = obj.get;
			const getFn = next => () => {
				return next();
			};
			const fn = jest.fn().mockImplementation(getFn(wrapper.nextFn(obj, 'get')));
			jest.spyOn(originalFn, 'apply');

			wrapper.wrap(obj, 'get', fn);
			obj.get();

			expect(originalFn.apply).toHaveBeenCalled();
			expect(fn).toHaveBeenCalled();
		});

		it('calling the function should only call the original method given the function was wrapped and subsequently unwrapped', () => {
			const obj = { get: jest.fn().mockImplementation(() => {}) };
			const originalFn = obj.get;
			const getFn = next => () => {
				return next();
			};
			const fn = jest.fn().mockImplementation(getFn(wrapper.nextFn(obj, 'get')));
			const unwrap = wrapper.wrap(obj, 'get', fn);

			unwrap();
			obj.get();

			expect(originalFn).toHaveBeenCalled();
			expect(fn).not.toHaveBeenCalled();
		});

		it('should append the new property to the __wrappers object if it already exists', () => {
			const obj = { get: () => {}, fetch: () => {} };
			wrapper.wrap(obj, 'get', () => {}); // should create wrappers obj

			wrapper.wrap(obj, 'fetch', () => {}); // add a new wrapper on a different property
			expect(obj.__wrappers.fetch).toBeDefined();
			expect(obj.__wrappers.get).toBeDefined();
		});

		it('should add the new wrapping function to the wrapping functions collection if __wrappers[property] already exists', () => {
			const obj = { get: () => {} };
			const fn1 = () => {};
			const fn2 = () => {};
			wrapper.wrap(obj, 'get', fn1);
			wrapper.wrap(obj, 'get', fn2);

			expect(obj.__wrappers.get.fns).toContain(fn2);
			expect(obj.__wrappers.get.fns.length).toEqual(2);
		});

		it('should return a function that will remove the added wrapper function', () => {
			const fn1 = () => {};
			const originalFn = () => {};
			const obj = { get: originalFn };

			const unwrap = wrapper.wrap(obj, 'get', fn1);
			expect(obj.get).toEqual(fn1);

			unwrap();
			expect(obj.get).toEqual(originalFn);
		});
	});

	describe('unwrap', () => {
		it('should not throw if object or property or object[property] is empty', () => {
			const obj = { get: () => {} };
			expect(() => wrapper.unwrap()).not.toThrow();
			expect(() => wrapper.unwrap(obj)).not.toThrow();
			expect(() => wrapper.unwrap(obj, 'doesnotexist')).not.toThrow();
		});

		it('should not throw if the __wrappers for object or specific wrappers field is empty', () => {
			const obj = { get: () => {} };

			// no wrappers
			expect(() => wrapper.unwrap(obj, 'request')).not.toThrow();

			wrapper.wrap(obj, 'get', () => wrapper.nextFn(obj, 'get'));
			expect(obj.__wrappers).toBeDefined();
			expect(() => wrapper.unwrap(obj, 'request')).not.toThrow();
		});

		it('should not throw if wrapperNumber passed is empty or beyond the length of the wrapping functions collection', () => {
			const obj = { get: () => {} };

			wrapper.wrap(obj, 'get', () => wrapper.nextFn(obj, 'get'));

			expect(() => wrapper.unwrap(obj, 'get')).not.toThrow();
			expect(() => wrapper.unwrap(obj, 'get', 100)).not.toThrow();
		});

		it('should set the value of wrapper function at passed wrapperNumber index to null', () => {
			const obj = { get: () => {} };

			wrapper.wrap(obj, 'get', () => wrapper.nextFn(obj, 'get'));
			wrapper.wrap(obj, 'get', () => wrapper.nextFn(obj, 'get'));

			// manually remove the first added wrapper
			wrapper.unwrap(obj, 'get', 1);

			expect(obj.__wrappers.get.fns[0]).toBe(null);
		});

		it('should delete the object[wrappers] if all wrapping functions are null', () => {
			const obj = { get: () => {} };

			wrapper.wrap(obj, 'get', () => wrapper.nextFn(obj, 'get'));
			wrapper.wrap(obj, 'get', () => wrapper.nextFn(obj, 'get'));

			// remove first wrapper fn
			wrapper.unwrap(obj, 'get', 1);
			// remove second wrapper fn
			wrapper.unwrap(obj, 'get', 2);

			expect(obj.__wrappers.get).not.toBeDefined();
		});
	});

	describe('nextFn', () => {
		it('should return undefined if object or property or value of object[property] is empty', () => {
			const obj = { get: () => {} };
			expect(wrapper.nextFn()).not.toBeDefined();
			expect(wrapper.nextFn(obj)).not.toBeDefined();
			expect(wrapper.nextFn(obj, 'requestsss')).not.toBeDefined();
		});

		it('should return a function if parameters are valid', () => {
			const obj = { get: () => {} };
			const next = wrapper.nextFn(obj, 'get');
			expect(typeof next).toBe('function');
		});

		it('should return a function that returns undefined if there are no wrappers defined for this object and property combination', () => {
			const obj = { get: () => {} };
			const next = wrapper.nextFn(obj, 'get');

			expect(next()).not.toBeDefined();
		});

		it('should return a function that applies the original function value (i.e. object[property]) with passed arguments, given a single wrapper function is defined', () => {
			const thisValue = {};
			const obj = {
				get: () => {
					console.log('test');
				}
			};
			const originalFn = obj.get;
			jest.spyOn(originalFn, 'apply');

			const next = wrapper.nextFn(obj, 'get');
			wrapper.wrap(obj, 'get', () => {});
			next(thisValue, [1, 2, 3, 4]); // first param is the obj to apply the fn on (the value of "this")

			expect(originalFn.apply).toHaveBeenCalledWith(thisValue, [1, 2, 3, 4]);
		});

		it('should return a function that applies the last non-null function in the wrapper functions collection (defined up till the point nextFn was called)', () => {
			const thisValue = {};
			const obj = { get: () => {} };
			const fn1 = jest.fn().mockImplementation(() => {});
			const fn2 = jest.fn().mockImplementation(() => {});
			wrapper.wrap(obj, 'get', fn1);
			const unwrap2 = wrapper.wrap(obj, 'get', () => {});
			jest.spyOn(fn1, 'apply');
			jest.spyOn(fn2, 'apply');

			const next = wrapper.nextFn(obj, 'get');
			unwrap2();
			next(thisValue, [1, 2, 3, 4]); // first param is the obj to apply the fn on (the value of "this")

			expect(fn2.apply).not.toHaveBeenCalled();
			expect(fn1.apply).toHaveBeenCalledWith(thisValue, [1, 2, 3, 4]);
		});

		it('should return a function that applies the original function if the wrappers collection (defined up till the point nextFn was initially called) becomes empty', () => {
			const thisValue = {};
			const obj = {
				get: () => {}
			};
			const originalFn = obj.get;
			const getFn = next => () => {
				return next();
			};
			const fn1 = getFn(wrapper.nextFn(obj, 'get'));
			const fn2 = getFn(wrapper.nextFn(obj, 'get'));
			const unwrap1 = wrapper.wrap(obj, 'get', fn1);
			const unwrap2 = wrapper.wrap(obj, 'get', fn2);
			jest.spyOn(originalFn, 'apply');
			jest.spyOn(fn1, 'apply');
			jest.spyOn(fn2, 'apply');

			const next = wrapper.nextFn(obj, 'get');
			wrapper.wrap(obj, 'get', () => {});
			unwrap1();
			unwrap2();
			next(thisValue, [1, 2, 3, 4]); // first param is the obj to apply the fn on (the value of "this")

			expect(originalFn.apply).toHaveBeenCalledWith(thisValue, [1, 2, 3, 4]); // eslint-disable-line
			expect(fn1.apply).not.toHaveBeenCalled();
			expect(fn2.apply).not.toHaveBeenCalled();
		});
	});
});
