# CoachConnect Screen Map

This document explains where a person can go in the application. It is intentionally small so navigation remains clear.

## Public navigation

```text
Home
├── Find a Coach
│   ├── All approved coaches (default view)
│   ├── Sort: Recommended / Rating / Price / Earliest availability
│   ├── Search and removable filters
│   └── Coach Profile
│       ├── About
│       ├── Services
│       ├── Included / Not included
│       ├── Facilities / What to bring
│       ├── Availability
│       └── Verified reviews
├── Become a Coach
├── Sign In
├── Register
├── Safety
├── Cancellation Policy
├── Privacy
└── Terms
```

## Member area

```text
Member Dashboard
├── Recommended Coaches
├── All Coaches
├── My Preferences
├── Upcoming Bookings
│   └── Booking Details
│       ├── General/exact confirmed venue information
│       ├── Cancellation status
│       └── Cancel Booking
├── Previous Bookings
│   └── Leave Review (completed bookings only)
├── Become a Coach / Coach application status
└── Account
```

## Coach tools on the same account

```text
Coach Dashboard
├── Find and Book Another Coach
├── Profile
│   ├── Edit Draft
│   ├── Preview
│   └── Submit for Approval
├── Services
│   ├── Create Service
│   └── Edit Service
├── Availability
│   ├── Weekly Hours
│   └── Time Off
├── Bookings
│   └── Booking Details
│       ├── Cancel Booking
│       └── Mark Complete when eligible
└── Account
```

## Administrator area

```text
Administrator Dashboard
├── Coach Applications
│   └── Approve / Reject with Reason
├── Coaches
│   └── Suspend / Restore with Reason
├── Bookings
│   └── View / Mark Complete with Reason
└── Reviews
    └── Hide / Restore with Reason
```

## Primary home-to-booking path

```text
Home
  → Search results
  → Coach profile
  → Service and available time
  → Booking review
  → Sign in/register if needed
  → Confirm reservation
  → Athlete booking details
```

## Navigation rules

- Visitors see no dashboard links until signed in.
- Every signed-in member can use athlete tools.
- A member with approved coach capability can switch between athlete and coach areas without another account.
- A member without coach capability sees an application action, not coach management controls.
- Coaches never see administrator controls unless administrator capability was granted separately.
- Coach suspension removes coach publication/actions but does not automatically remove athlete access.
- A coach cannot book or review their own service.
- The coach's account email and exact location are absent from public screens.
- A user can always return to search without losing understandable context.
- Mobile navigation uses one menu and one primary action, not multiple stacked toolbars.
