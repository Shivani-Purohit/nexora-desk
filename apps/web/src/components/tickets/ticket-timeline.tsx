'use client';

import React from 'react';

export type ActivityItem = {
  id: string;
  type:
    | 'COMMENT_ADDED'
    | 'STATUS_CHANGED'
    | 'PRIORITY_CHANGED'
    | 'ASSIGNMENT_CHANGED'
    | 'SYSTEM_LOG';
  metadata: any;
  createdAt: string;
  actor?: {
    firstName: string;
    lastName: string | null;
    email: string;
  } | null;
  comment?: {
    message: string;
    isInternal: boolean;
    author: {
      firstName: string;
      lastName: string | null;
    };
  } | null;
};

interface TicketTimelineProps {
  timeline: ActivityItem[];
}

export function TicketTimeline({ timeline }: TicketTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 border rounded-lg bg-gray-50">
        No activities or comments on this ticket yet.
      </div>
    );
  }

  return (
    <div className="flow-root py-4">
      <ul role="list" className="-mb-8">
        {timeline.map((item, idx) => {
          const isLast = idx === timeline.length - 1;
          const formattedTime = new Date(item.createdAt).toLocaleString();

          return (
            <li key={item.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                <div className="relative flex space-x-3 items-start">
                  {item.type === 'COMMENT_ADDED' && item.comment ? (
                    <div className="flex min-w-0 flex-1 justify-between space-x-4">
                      <div
                        className={`rounded-lg p-4 w-full border ${
                          item.comment.isInternal
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-white border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span className="font-semibold text-gray-900">
                            {item.comment.author.firstName}{' '}
                            {item.comment.author.lastName ?? ''}
                            {item.comment.isInternal && (
                              <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 rounded font-bold text-[10px]">
                                Internal Note
                              </span>
                            )}
                          </span>
                          <time>{formattedTime}</time>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {item.comment.message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-xs text-gray-500 py-1.5 pl-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                      <span>
                        <strong className="text-gray-900">
                          {item.actor
                            ? `${item.actor.firstName} ${item.actor.lastName ?? ''}`
                            : 'System'}
                        </strong>{' '}
                        {renderActivityLabel(item)}
                      </span>
                      <span>•</span>
                      <time className="text-gray-400">{formattedTime}</time>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function renderActivityLabel(item: ActivityItem) {
  switch (item.type) {
    case 'STATUS_CHANGED':
      return `changed status from ${item.metadata?.from} to ${item.metadata?.to}`;
    case 'PRIORITY_CHANGED':
      return `changed priority from ${item.metadata?.from} to ${item.metadata?.to}`;
    case 'ASSIGNMENT_CHANGED':
      return `reassigned this ticket`;
    case 'SYSTEM_LOG':
      return `created this ticket`;
    default:
      return `updated the ticket`;
  }
}