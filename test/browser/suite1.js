this.suite1 = {
  test1: function(test) {
    test.expect(1);
    test.ok(true, 'Verify test was run');
    test.done();
  },
  test2: function(test) {
    test.expect(1);
    test.ok(false, 'Verify test was run');
    test.done();
  }
};
