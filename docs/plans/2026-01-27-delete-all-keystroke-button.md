# Delete All Keystroke Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Delete All Keystroke" button below the existing "Delete Keystroke" button in the KeystrokeSettingsPanel that will delete all keystroke regions from the timeline.

**Architecture:** The feature follows the existing pattern where the VideoEditor manages state, SettingsPanel passes props, and KeystrokeSettingsPanel renders UI. We'll add a new callback prop `onDeleteAll` that flows from VideoEditor → SettingsPanel → KeystrokeSettingsPanel.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

### Task 1: Add `handleDeleteAllKeystrokes` function to VideoEditor.tsx

**Files:**
- Modify: `src/components/video-editor/VideoEditor.tsx:702-707`

**Step 1: Write the failing test**

```typescript
// In a test file, this test would fail because handleDeleteAllKeystrokes doesn't exist
describe('Delete All Keystrokes', () => {
  it('should clear all keystroke regions when called', () => {
    const { result } = renderHook(() => useVideoEditor());
    const initialKeystrokes = [{ id: 'k1' }, { id: 'k2' }];
    
    act(() => {
      result.current.handleDeleteAllKeystrokes();
    });
    
    expect(result.current.keystrokeRegions).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL with "handleDeleteAllKeystrokes is not a function"

**Step 3: Write minimal implementation**

```typescript
const handleDeleteAllKeystrokes = useCallback(() => {
  setKeystrokeRegions([]);
  setSelectedKeystrokeId(null);
}, []);
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/video-editor/VideoEditor.tsx
git commit -m "feat: add handleDeleteAllKeystrokes function"
```

---

### Task 2: Pass `onDeleteAllKeystrokes` from VideoEditor to SettingsPanel

**Files:**
- Modify: `src/components/video-editor/VideoEditor.tsx:1332`

**Step 1: Write the failing test**

```typescript
it('should pass onDeleteAllKeystrokes to SettingsPanel', () => {
  const onDeleteAllKeystrokes = vi.fn();
  render(<VideoEditor onDeleteAllKeystrokes={onDeleteAllKeystrokes} />);
  expect(onDeleteAllKeystrokes).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL with "Property 'onDeleteAllKeystrokes' does not exist"

**Step 3: Write minimal implementation**

```typescript
// In the SettingsPanel component call at line 1332, add:
onDeleteAllKeystrokes={handleDeleteAllKeystrokes}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/video-editor/VideoEditor.tsx
git commit -m "feat: pass onDeleteAllKeystrokes prop to SettingsPanel"
```

---

### Task 3: Add `onDeleteAllKeystrokes` prop to SettingsPanelProps and pass it to KeystrokeSettingsPanel

**Files:**
- Modify: `src/components/video-editor/SettingsPanel.tsx:111`
- Modify: `src/components/video-editor/SettingsPanel.tsx:192`
- Modify: `src/components/video-editor/SettingsPanel.tsx:~450` (KeystrokeSettingsPanel call)

**Step 1: Write the failing test**

```typescript
it('should accept onDeleteAllKeystrokes prop', () => {
  render(
    <SettingsPanel
      onDeleteAllKeystrokes={() => {}}
      selectedKeystrokeId="test"
      keystrokeRegions={[]}
      onKeystrokeDelete={() => {}}
    />
  );
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL with "Property 'onDeleteAllKeystrokes' does not exist"

**Step 3: Write minimal implementation**

Add to SettingsPanelProps interface:
```typescript
onDeleteAllKeystrokes?: () => void;
```

Add to SettingsPanel function parameters:
```typescript
onDeleteAllKeystrokes,
```

Pass to KeystrokeSettingsPanel:
```typescript
onDeleteAll={onKeystrokeDelete}
onDeleteAllKeystrokes={onDeleteAllKeystrokes}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/video-editor/SettingsPanel.tsx
git commit -m "feat: add onDeleteAllKeystrokes prop to SettingsPanel"
```

---

### Task 4: Add `onDeleteAll` prop to KeystrokeSettingsPanelProps and add Delete All button

**Files:**
- Modify: `src/components/video-editor/keystroke/KeystrokeSettingsPanel.tsx:15`
- Modify: `src/components/video-editor/keystroke/KeystrokeSettingsPanel.tsx:59`
- Modify: `src/components/video-editor/keystroke/KeystrokeSettingsPanel.tsx:242-255`

**Step 1: Write the failing test**

```typescript
it('should render Delete All Keystroke button', () => {
  render(
    <KeystrokeSettingsPanel
      keystroke={{ id: 'k1', startMs: 0, endMs: 100, text: 'Test', eventType: 'keystroke', positionPreset: 'bottom-center', style: DEFAULT_KEYSTROKE_STYLE }}
      onStyleChange={() => {}}
      onPositionChange={() => {}}
      onDelete={() => {}}
      onDeleteAll={() => {}}
    />
  );
  expect(screen.getByText('Delete All Keystroke')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL with "Unable to find an element with the text: Delete All Keystroke"

**Step 3: Write minimal implementation**

Add to KeystrokeSettingsPanelProps:
```typescript
onDeleteAll?: () => void;
```

Add to KeystrokeSettingsPanel parameters:
```typescript
onDeleteAll,
```

Add the Delete All button after the Delete Keystroke button (lines 242-255):
```typescript
<Button
  onClick={onDeleteAll}
  variant="destructive"
  size="sm"
  className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
>
  <Trash2 className="w-4 h-4" />
  Delete All Keystroke
</Button>
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/video-editor/keystroke/KeystrokeSettingsPanel.tsx
git commit -m "feat: add Delete All Keystroke button to KeystrokeSettingsPanel"
```

---

### Task 5: Add tests for the new functionality

**Files:**
- Create: `src/components/video-editor/keystroke/KeystrokeSettingsPanel.test.ts` (or add to existing test)

**Step 1: Write comprehensive tests**

```typescript
describe('KeystrokeSettingsPanel Delete All', () => {
  const defaultProps = {
    keystroke: {
      id: 'k1',
      startMs: 0,
      endMs: 100,
      text: 'Ctrl+C',
      eventType: 'keystroke' as const,
      positionPreset: 'bottom-center' as const,
      style: DEFAULT_KEYSTROKE_STYLE,
    },
    onStyleChange: vi.fn(),
    onPositionChange: vi.fn(),
    onDelete: vi.fn(),
  };

  it('should call onDeleteAll when Delete All button is clicked', () => {
    const onDeleteAll = vi.fn();
    render(
      <KeystrokeSettingsPanel
        {...defaultProps}
        onDeleteAll={onDeleteAll}
      />
    );
    
    const deleteAllButton = screen.getByText('Delete All Keystroke');
    fireEvent.click(deleteAllButton);
    
    expect(onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it('should not render Delete All button when onDeleteAll is not provided', () => {
    render(
      <KeystrokeSettingsPanel {...defaultProps} />
    );
    
    expect(screen.queryByText('Delete All Keystroke')).not.toBeInTheDocument();
  });

  it('should have proper styling matching Delete Keystroke button', () => {
    const onDeleteAll = vi.fn();
    render(
      <KeystrokeSettingsPanel
        {...defaultProps}
        onDeleteAll={onDeleteAll}
      />
    );
    
    const deleteAllButton = screen.getByText('Delete All Keystroke');
    expect(deleteAllButton).toHaveClass('w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20');
  });
});
```

**Step 2: Run tests to verify they pass**

Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add src/components/video-editor/keystroke/KeystrokeSettingsPanel.test.ts
git commit -m "test: add tests for Delete All Keystroke button"
```

---

### Task 6: Verify the implementation works end-to-end

**Files:**
- Test: `src/components/video-editor/VideoEditor.test.tsx` or manual testing

**Step 1: Write integration test**

```typescript
it('should delete all keystrokes when Delete All button is clicked', async () => {
  const user = userEvent.setup();
  
  render(
    <VideoEditor />
  );
  
  // Add some keystrokes first (via simulation)
  // Then click the Delete All button
  const deleteAllButton = await screen.findByText('Delete All Keystroke');
  await user.click(deleteAllButton);
  
  // Verify toast or confirmation appears
  expect(toast.success).toHaveBeenCalledWith('All keystrokes deleted');
});
```

**Step 2: Run test to verify it passes**

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/video-editor/VideoEditor.test.tsx
git commit -m "test: add integration test for Delete All Keystrokes feature"
```

---

**Plan complete and saved to `docs/plans/2026-01-27-delete-all-keystroke-button.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
