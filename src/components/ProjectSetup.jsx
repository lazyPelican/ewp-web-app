import React, { useState } from "react"
import { Field } from "./Field.jsx"

export function ProjectSetup({ project, onChange, onNext, contractors = [] }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!project.name) e.name = "Required";
    if (!project.address) e.address = "Required";
    if (!project.bidDate) e.bidDate = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Project Details</div>
        <div className="gold-rule" />
        <div className="page-subtitle">Enter the project and client information to get started.</div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">CLIENT INFORMATION</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <Field label="Project Name" error={errors.name}>
              <input aria-label="Project name" className={errors.name ? "error" : ""} value={project.name} placeholder="e.g. Johnson Kitchen Remodel"
                onChange={e => onChange({ name: e.target.value })} />
            </Field>
            <Field label="Project Address" error={errors.address}>
              <input aria-label="Project address" className={errors.address ? "error" : ""} value={project.address} placeholder="123 Main St, Minneapolis MN"
                onChange={e => onChange({ address: e.target.value })} />
            </Field>
            <Field label="Contact Name">
              <input value={project.contactName} placeholder="Full name"
                onChange={e => onChange({ contactName: e.target.value })} />
            </Field>
            <Field label="Contact Phone">
              <input
                value={project.contactPhone}
                placeholder="(612) 555-0100"
                maxLength={14}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                  let formatted = ""
                  if (digits.length === 0) formatted = ""
                  else if (digits.length <= 3) formatted = `(${digits}`
                  else if (digits.length <= 6) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
                  else formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                  onChange({ contactPhone: formatted })
                }}
              />
            </Field>
            <Field label="Email Address">
              <input aria-label="Email address" type="email" value={project.email} placeholder="client@email.com"
                onChange={e => onChange({ email: e.target.value })} />
            </Field>
            <Field label="Bid Date" error={errors.bidDate}>
              <input
                className={errors.bidDate ? "error" : ""}
                type="date"
                value={project.bidDate}
                onChange={e => onChange({ bidDate: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">BILLING CONTACT</span><span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 8 }}>Optional</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <Field label="Billing Name">
              <input value={project.billingName || ""} placeholder="Same as contact if left blank"
                onChange={e => onChange({ billingName: e.target.value })} />
            </Field>
            <Field label="Billing Email">
              <input type="email" value={project.billingEmail || ""} placeholder="billing@email.com"
                onChange={e => onChange({ billingEmail: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">CONTRACTOR DETAILS</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-3">
            <Field label="Is there a Contractor?">
              <select value={project.contractorYN} onChange={e => onChange({ contractorYN: e.target.value })}>
                <option>No</option><option>Yes</option>
              </select>
            </Field>
            {project.contractorYN === "Yes" && <>
              <Field label="Contractor Name">
                <select
                  value={contractors.some(c => c.name === project.contractorName) ? project.contractorName : (project.contractorName ? "__custom__" : "")}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === "" || v === "__custom__") {
                      onChange({ contractorName: v === "__custom__" ? (project.contractorName || "") : "" });
                    } else {
                      const c = contractors.find(c => c.name === v);
                      onChange({ contractorName: v, contractorContact: c?.contact || project.contractorContact || "" });
                    }
                  }}>
                  <option value="">— Select contractor —</option>
                  {contractors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="__custom__">Other (enter manually)</option>
                </select>
                {(!contractors.some(c => c.name === project.contractorName) && project.contractorName !== undefined) && (
                  <input value={project.contractorName} placeholder="Type contractor name"
                    onChange={e => onChange({ contractorName: e.target.value })}
                    style={{ marginTop: 6 }} />
                )}
              </Field>
              <Field label="Contractor Contact">
                <input value={project.contractorContact} placeholder="Phone or email"
                  onChange={e => {
                    const raw = e.target.value
                    // Only auto-format if it looks like a phone number (digits/spaces/parens/dashes only)
                    const isPhone = /^[\d\s()\-+]*$/.test(raw) && /\d/.test(raw)
                    if (isPhone) {
                      const digits = raw.replace(/\D/g, "").slice(0, 10)
                      let formatted = ""
                      if (digits.length === 0) formatted = ""
                      else if (digits.length <= 3) formatted = `(${digits}`
                      else if (digits.length <= 6) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
                      else formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                      onChange({ contractorContact: formatted })
                    } else {
                      onChange({ contractorContact: raw })
                    }
                  }} />
              </Field>
            </>}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-24">
        <button className="btn btn-gold btn-lg" onClick={handleNext}>
          Continue to Rooms →
        </button>
      </div>
    </div>
  );
}
