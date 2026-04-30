import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { Customer } from '../../customers/customer.entity';
import { Note } from '../../notes/note.entity';
import { Organization } from '../../organizations/organization.entity';
import { User, UserRole } from '../../users/user.entity';

async function seed() {
  await dataSource.initialize();

  await dataSource.transaction(async (manager) => {
    const orgRepo = manager.getRepository(Organization);
    const userRepo = manager.getRepository(User);
    const customerRepo = manager.getRepository(Customer);
    const noteRepo = manager.getRepository(Note);

    await manager.query('TRUNCATE activity_logs, notes, customers, users, organizations RESTART IDENTITY CASCADE');

    const [acme, globex] = await orgRepo.save([{ name: 'Acme Corp' }, { name: 'Globex Inc' }]);
    const passwordHash = await bcrypt.hash('password123', 12);

    const [acmeAdmin, acmeMember, globexAdmin, globexMember] = await userRepo.save([
      {
        organizationId: acme.id,
        name: 'Alice Admin',
        email: 'alice@acme.com',
        passwordHash,
        role: UserRole.Admin,
      },
      {
        organizationId: acme.id,
        name: 'Bob Member',
        email: 'bob@acme.com',
        passwordHash,
        role: UserRole.Member,
      },
      {
        organizationId: globex.id,
        name: 'Carol Admin',
        email: 'carol@globex.com',
        passwordHash,
        role: UserRole.Admin,
      },
      {
        organizationId: globex.id,
        name: 'Dave Member',
        email: 'dave@globex.com',
        passwordHash,
        role: UserRole.Member,
      },
    ]);

    const acmeCustomers = Array.from({ length: 100 }, (_, index) => ({
      organizationId: acme.id,
      name: `Acme Customer ${index + 1}`,
      email: `customer${index + 1}@acme-client.com`,
      phone: `+1555${String(index).padStart(7, '0')}`,
      assignedTo: index < 5 ? acmeMember.id : null,
    }));

    const globexCustomers = Array.from({ length: 100 }, (_, index) => ({
      organizationId: globex.id,
      name: `Globex Customer ${index + 1}`,
      email: `customer${index + 1}@globex-client.com`,
      phone: `+1666${String(index).padStart(7, '0')}`,
      assignedTo: index < 5 ? globexMember.id : null,
    }));

    const customers = await customerRepo.save([...acmeCustomers, ...globexCustomers]);
    await noteRepo.save([
      {
        customerId: customers[0].id,
        organizationId: acme.id,
        content: 'Seed note: first Acme customer is ready for follow-up.',
        createdBy: acmeAdmin.id,
      },
      {
        customerId: customers[100].id,
        organizationId: globex.id,
        content: 'Seed note: first Globex customer requested a renewal quote.',
        createdBy: globexAdmin.id,
      },
    ]);
  });

  console.log('Seed complete');
  console.log('alice@acme.com / password123 (admin)');
  console.log('bob@acme.com / password123 (member)');
  console.log('carol@globex.com / password123 (admin)');
  console.log('dave@globex.com / password123 (member)');

  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
