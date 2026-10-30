import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';
import { CrApiService } from '../../api/cr-api.service';
import { CrDetail } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}
function requireDetail(component: CrDetailComponent): CrDetail {
	const detail = component.detail;

	if (detail === null) {
		throw new Error('Expected change request detail to be loaded');
	}

	return detail;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	// NEW TEST: Reject permission
	it('hides Reject for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1');

		const rejectSection =
			fixture.nativeElement.querySelector('.cr-actions__reject');

		expect(rejectSection).toBeNull();
	});
	it('sorts timeline events from oldest to newest', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		const detail = requireDetail(component);
		const audit = detail.audit;

		detail.audit = [...audit].reverse();

		const timeline = component.timeline;

		expect(timeline.map(entry => entry.at)).toEqual(
			[...audit]
				.map(entry => entry.at)
				.sort((a, b) => Date.parse(a) - Date.parse(b))
		);

		expect(detail.audit).toEqual([...audit].reverse());
	});
	it('approves a pending change request', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		expect(component.detail?.status).toBe('PENDING_APPROVAL');

		const approveButton: HTMLButtonElement =
			fixture.nativeElement.querySelector('.cr-actions__approve');

		approveButton.click();
		fixture.detectChanges();

		expect(component.submitting).toBe(true);
		expect(approveButton.disabled).toBe(true);

		await flush();
		fixture.detectChanges();

		expect(component.detail?.status).toBe('APPROVED');
		expect(component.submitting).toBe(false);
		expect(component.canApprove).toBe(false);
	});
	it('requires a valid rejection reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		const rejectButton: HTMLButtonElement =
			fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		expect(rejectButton.disabled).toBe(true);

		component.rejectControl.setValue('   ');
		fixture.detectChanges();

		expect(component.rejectControl.invalid).toBe(true);
		expect(rejectButton.disabled).toBe(true);

		component.rejectControl.setValue('Incorrect quantity');
		fixture.detectChanges();

		expect(component.rejectControl.valid).toBe(true);
		expect(rejectButton.disabled).toBe(false);
	});
	it('rejects a pending change request and saves the reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		const initialAuditLength = requireDetail(component).audit.length;

		component.rejectControl.setValue('  Incorrect quantity  ');
		fixture.detectChanges();

		const rejectButton: HTMLButtonElement =
			fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		rejectButton.click();
		fixture.detectChanges();

		expect(component.submitting).toBe(true);
		expect(rejectButton.disabled).toBe(true);

		await flush();
		fixture.detectChanges();

		expect(component.detail?.status).toBe('REJECTED');
		expect(component.submitting).toBe(false);
		expect(component.canReject).toBe(false);

		expect(component.detail?.audit).toHaveLength(initialAuditLength + 1);
		const audit = requireDetail(component).audit;
		expect(audit[audit.length - 1]).toEqual(
			expect.objectContaining({
				action: 'REJECT',
				byUserId: users.approver.id,
				note: 'Incorrect quantity'
			})
		);
	});
	it('shows an error and keeps the CR pending when approval fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;
		const api = TestBed.inject(CrApiService);

		api.failNext = true;

		const approveButton: HTMLButtonElement =
			fixture.nativeElement.querySelector('.cr-actions__approve');

		approveButton.click();

		await flush();
		fixture.detectChanges();

		expect(component.detail?.status).toBe('PENDING_APPROVAL');
		expect(component.submitting).toBe(false);
		expect(component.actionError).toBe('Network error');

		const errorMessage: HTMLElement =
			fixture.nativeElement.querySelector('.cr-actions__error');

		expect(errorMessage.textContent).toContain('Network error');

		const storedCR = await api.getChangeRequest(users.approver, 'CR-1');
		expect(storedCR.status).toBe('PENDING_APPROVAL');
	});
	it('shows an error and keeps the CR pending when rejection fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;
		const api = TestBed.inject(CrApiService);

		const initialAuditLength = requireDetail(component).audit.length;

		component.rejectControl.setValue('Incorrect quantity');
		fixture.detectChanges();

		api.failNext = true;

		const rejectButton: HTMLButtonElement =
			fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		rejectButton.click();

		await flush();
		fixture.detectChanges();

		expect(component.detail?.status).toBe('PENDING_APPROVAL');
		expect(component.submitting).toBe(false);
		expect(component.actionError).toBe('Network error');

		const errorMessage: HTMLElement =
			fixture.nativeElement.querySelector('.cr-actions__error');

		expect(errorMessage.textContent).toContain('Network error');

		const storedCR = await api.getChangeRequest(users.approver, 'CR-1');

		expect(storedCR.status).toBe('PENDING_APPROVAL');
		expect(storedCR.audit).toHaveLength(initialAuditLength);
	});
});