import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './cr-list.component';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function render(user: ReqUser): Promise<ComponentFixture<CrListComponent>> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});

	await TestBed.compileComponents();

	const fixture = TestBed.createComponent(CrListComponent);
	fixture.detectChanges();

	await flush();
	fixture.detectChanges();

	return fixture;
}

describe('CrListComponent', () => {
	// TEST 1 — Organization-scoped list
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);

		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	// TEST 2 — Empty organization
	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({
			id: 'x',
			orgCode: 'org-empty',
			policies: ['cr_r_o'],
		});

		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();

		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	// TEST 3 — Status filtering
	it('filters change requests by status', async () => {
		const fixture = await render(users.approver);
		const component = fixture.componentInstance;

		const allRows = component.visibleRows;
		expect(allRows.length).toBe(3);

		component.onFilterChange('APPROVED');
		fixture.detectChanges();

		const filteredRows = component.visibleRows;

		expect(filteredRows.every((row) => row.status === 'APPROVED')).toBe(true);

		expect(filteredRows.length).toBeLessThan(allRows.length);
	});

	// TEST 4 — Empty filter results
	it('shows a message when no requests match the filter', async () => {
		const fixture = await render(users.approver);
		const component = fixture.componentInstance;

		component.onFilterChange('CANCELLED');
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__filtered-empty')).not.toBeNull();

		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	// TEST 5 — Loading state
	it('shows a loading message while requests are being fetched', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});

		await TestBed.compileComponents();

		const fixture = TestBed.createComponent(CrListComponent);

		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__loading')).not.toBeNull();

		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__loading')).toBeNull();

		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	// TEST 6 — API error
	it('shows an error message and Retry button when loading fails', async () => {
		const fixture = await render(users.approver);
		const api = TestBed.inject(CrApiService);

		api.failNext = true;

		await fixture.componentInstance.load();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__error')).not.toBeNull();

		const retryButton = fixture.nativeElement.querySelector('.cr-list__error button') as HTMLButtonElement;

		expect(retryButton).not.toBeNull();
		expect(retryButton.textContent).toContain('Retry');
	});

	// TEST 7 — Retry after error
	it('loads requests successfully after clicking Retry', async () => {
		const fixture = await render(users.approver);
		const api = TestBed.inject(CrApiService);

		api.failNext = true;

		await fixture.componentInstance.load();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__error')).not.toBeNull();

		const retryButton = fixture.nativeElement.querySelector('.cr-list__error button') as HTMLButtonElement;

		retryButton.click();

		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__error')).toBeNull();

		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});
});
