describe("CI Smoke Test", () => {
  it("should confirm tests are running in GitHub Actions", () => {
    expect(1 + 1).toBe(2);
  });
});