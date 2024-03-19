import { Prose } from '@/components/Prose';
import getInterface from '@/data/get-interface';

export default function Page({ params }: { params: { name: string } }) {
  const meshInterface = getInterface(params.name);
  console.log(meshInterface);

  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <Prose className="flex-auto">
      <Header meshInterface={meshInterface} />

      </Prose>
    </article>
  );
}

function Header({ meshInterface }) {
  return (
    <div className="flex gap-2 items-center">
      <h1>{meshInterface.name}</h1>
      {/* {meshInterface.implementedTypes && (
        <div className="flex gap-1">
          <span>implements</span>
          {meshClass.implementedTypes.map((implementedType: any, i: number) => {
            return (
              <span key={uuidv4()}>
                <a href={`/inteface/${implementedType.name}`}>
                  {implementedType.name}
                </a>
              </span>
            );
          })}
        </div>
      )} */}
    </div>
  );
}