import { test, expect } from '@playwright/test';

/**
 * UI Automation — Instructor Login & Signup pages
 * These pages are public (no auth required to view the forms).
 * Note: CardTitle renders as a <div>, not a heading — use getByText instead of getByRole('heading').
 */
test.describe('Instructor Login and Signup', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login_instructor');
    });

    // 20.1
    test('[US 1.01] success: login page renders with email and password fields', async ({ page }) => {
      // CardTitle is a <div>, so use getByText
      await expect(page.getByText('Welcome back')).toBeVisible();
      await expect(page.getByText('Sign in to your instructor account')).toBeVisible();

      // Verify email field
      const emailField = page.getByLabel('Email');
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveAttribute('type', 'email');

      // Verify password field
      const passwordField = page.getByLabel('Password');
      await expect(passwordField).toBeVisible();
      await expect(passwordField).toHaveAttribute('type', 'password');

      // Verify Sign In button
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    // 20.2
    test('[US 1.01] success: login page has Google OAuth button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    });

    // 20.3
    test('[US 1.01] failure: submitting empty form shows validation', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Browser-native HTML5 validation on required email field
      const emailField = page.getByLabel('Email');
      const isInvalid = await emailField.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBe(true);
    });

    // 20.4
    test('[US 1.01] failure: invalid credentials show error message', async ({ page }) => {
      await page.getByLabel('Email').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword');

      await page.getByRole('button', { name: 'Sign In' }).click();

      // Supabase returns an error shown in Alert
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    });

    // 20.5
    test('[US 1.01] success: login page has link to signup page', async ({ page }) => {
      // "Sign Up" is a <button>, not <a>
      const signUpButton = page.getByRole('button', { name: 'Sign Up' });
      await expect(signUpButton).toBeVisible();

      await signUpButton.click();
      await expect(page).toHaveURL(/\/create_instructor/);
    });
  });

  test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/create_instructor');
    });

    // 20.6
    test('[US 1.02] success: signup page renders with all required fields', async ({ page }) => {
      await expect(page.getByText('Create your account')).toBeVisible();
      await expect(page.getByText('Sign up to start managing your courses')).toBeVisible();

      // Full Name field
      await expect(page.getByLabel('Full Name')).toBeVisible();

      // Email field
      const emailField = page.getByLabel('Email');
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveAttribute('type', 'email');

      // Password field
      const passwordField = page.getByLabel('Password');
      await expect(passwordField).toBeVisible();
      await expect(passwordField).toHaveAttribute('type', 'password');

      // Password hint
      await expect(page.getByText('Must be at least 8 characters')).toBeVisible();

      // Terms checkbox
      await expect(page.getByText('I agree to the Terms and Privacy Policy')).toBeVisible();

      // Sign Up button
      await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    });

    // 20.7
    test('[US 1.02] failure: short password shows error', async ({ page }) => {
      await page.getByLabel('Full Name').fill('Test Instructor');
      await page.getByLabel('Email').fill('test@ualberta.ca');
      await page.getByLabel('Password').fill('short');

      // Check the terms checkbox (it's a raw <input type="checkbox">, not a Radix checkbox)
      await page.locator('input[type="checkbox"]').check();

      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible({ timeout: 5000 });
    });

    // 20.8
    test('[US 1.02] failure: unchecked terms shows error', async ({ page }) => {
      await page.getByLabel('Full Name').fill('Test Instructor');
      await page.getByLabel('Email').fill('test@ualberta.ca');
      await page.getByLabel('Password').fill('validpassword123');
      // Leave checkbox unchecked

      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('You must agree to the Terms and Conditions')).toBeVisible({ timeout: 5000 });
    });

    // 20.9
    test('[US 1.02] success: signup page has link to login page', async ({ page }) => {
      // "Sign In" is a <button>, not <a>
      const signInButton = page.getByRole('button', { name: 'Sign In' });
      await expect(signInButton).toBeVisible();

      await signInButton.click();
      await expect(page).toHaveURL(/\/login_instructor/);
    });
  });
});